// src/pages/ClientPortal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

import { Zap, AlertCircle, CheckCircle2, Activity, FileText, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { format } from "date-fns";

function isMissingTableError(err) {
  if (!err) return false;
  if (err.status === 404) return true;
  const msg = String(err.message || "").toLowerCase();
  return msg.includes("could not find") || msg.includes("not found") || msg.includes("does not exist");
}

export default function ClientPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [clientData, setClientData] = useState(null);

  // 1) user logado
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Erro ao buscar user:", error);
      setCurrentUser(data?.user ?? null);
    })();
  }, []);

  // 2) client pelo email (ou cria)
  const clientByEmailQuery = useQuery({
    queryKey: ["clientPortalClientByEmail", currentUser?.email],
    enabled: !!currentUser?.email,
    queryFn: async () => {
      const email = currentUser.email;

      const { data: found, error: findErr } = await supabase
        .from("clients")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (findErr) throw findErr;
      if (found) return found;

      const payload = {
        email,
        name: currentUser.user_metadata?.name || email.split("@")?.[0] || "",
        status: "ENTRADA",
      };

      const { data: created, error: insertErr } = await supabase
        .from("clients")
        .insert(payload)
        .select("*")
        .single();

      if (insertErr) throw insertErr;
      return created;
    },
  });

  useEffect(() => {
    if (clientByEmailQuery.data) setClientData(clientByEmailQuery.data);
  }, [clientByEmailQuery.data]);

  // helper: sempre usa useQuery, mas devolve [] quando tabela não existe (404)
  const safeList = (key, enabled, fn) =>
    useQuery({
      queryKey: key,
      enabled,
      queryFn: async () => {
        try {
          return await fn();
        } catch (err) {
          if (isMissingTableError(err)) return [];
          throw err;
        }
      },
    });

  // 3) plant_sales
  const plantSalesQuery = safeList(
    ["clientPlantSales", clientData?.id],
    !!clientData?.id,
    async () => {
      const { data, error } = await supabase
        .from("plant_sales")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  );

  // 4) energy_production
  const energyQuery = safeList(
    ["clientEnergyProduction", clientData?.power_plant_id],
    !!clientData?.power_plant_id,
    async () => {
      const { data, error } = await supabase
        .from("energy_production")
        .select("*")
        .eq("power_plant_id", clientData.power_plant_id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  );

  // 5) documents
  const documentsQuery = safeList(
    ["clientDocuments", clientData?.id],
    !!clientData?.id,
    async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("related_entity", "client")
        .eq("related_entity_id", clientData.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    }
  );

  // ✅ SEMPRE arrays (pra não quebrar)
  const plantSales = Array.isArray(plantSalesQuery.data) ? plantSalesQuery.data : [];
  const energyProduction = Array.isArray(energyQuery.data) ? energyQuery.data : [];
  const documents = Array.isArray(documentsQuery.data) ? documentsQuery.data : [];

  // ✅ TODOS useMemo AQUI EM CIMA (antes de qualquer return)
  const latestProduction = energyProduction.length ? energyProduction[0] : null;

  const totalProduction = useMemo(() => {
    return energyProduction.reduce((sum, p) => sum + Number(p?.production_kwh || 0), 0);
  }, [energyProduction]);

  const averageEfficiency = useMemo(() => {
    if (!energyProduction.length) return 0;
    const s = energyProduction.reduce((sum, p) => sum + Number(p?.efficiency_percentage || 0), 0);
    return s / energyProduction.length;
  }, [energyProduction]);

  const activeProject = useMemo(() => {
    return plantSales.find((s) =>
      ["in_progress", "installed", "online", "issue"].includes(String(s?.status || ""))
    );
  }, [plantSales]);

  const projectStatus = activeProject?.status || "offline";
  const isOnline = projectStatus === "online";
  const hasIssue = projectStatus === "issue" || !!latestProduction?.has_alert;

  const fmt = (d) => {
    try {
      return format(new Date(d), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  const money = (v) => {
    const n = Number(v || 0);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Agora sim pode ter returns condicionais
  const loading =
    !currentUser ||
    clientByEmailQuery.isLoading ||
    (clientData?.id && (plantSalesQuery.isLoading || documentsQuery.isLoading)) ||
    (clientData?.power_plant_id && energyQuery.isLoading);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (clientByEmailQuery.isError) {
    const msg =
      clientByEmailQuery.error?.message ||
      "Erro ao carregar seu cadastro. Verifique permissões/RLS no Supabase.";
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Erro ao abrir o Portal</h3>
            <p className="text-slate-600">{msg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Dados não encontrados</h3>
            <p className="text-slate-600">
              Não encontramos (nem conseguimos criar) seu cadastro pelo e-mail{" "}
              <b>{currentUser?.email}</b>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Olá, {clientData.name || "Cliente"}!
            </h1>
            <p className="text-slate-600 mt-1">Seu Portal do Cliente</p>
          </div>

          <div className="flex items-center gap-3">
            {isOnline ? (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold">Sistema Online</span>
              </div>
            ) : hasIssue ? (
              <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-full">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Alerta Detectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 text-slate-700 px-4 py-2 rounded-full">
                <Activity className="w-5 h-5" />
                <span className="font-semibold">Offline</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Economia Mensal</p>
            <h2 className="text-2xl font-bold">{money(clientData.monthly_savings_brl)}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Economia Total</p>
            <h2 className="text-2xl font-bold">{money(clientData.total_savings_brl)}</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Produção Atual</p>
            <h2 className="text-2xl font-bold">{Number(latestProduction?.production_kwh || 0)} kWh</h2>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">Eficiência Média</p>
            <h2 className="text-2xl font-bold">{Number(averageEfficiency || 0).toFixed(1)}%</h2>
          </CardContent>
        </Card>
      </div>

      {/* Main */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status do Projeto */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Status do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            {activeProject ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-slate-600">Tipo de Projeto</p>
                    <p className="font-semibold">{activeProject.project_type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Status</p>
                    <p className="font-semibold">{activeProject.status || "-"}</p>
                  </div>
                </div>

                {hasIssue && latestProduction?.alert_message && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-rose-900 mb-1">Alerta de Sistema</h4>
                        <p className="text-sm text-rose-700">{latestProduction.alert_message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Nenhum projeto ativo no momento</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-600">{doc.type}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Nenhum documento disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      {energyProduction.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Histórico de Produção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {energyProduction.slice(0, 5).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {prod.date ? fmt(prod.date) : "-"}
                      </p>
                      <p className="text-sm text-slate-600">
                        {prod.production_kwh ?? 0} kWh • {prod.efficiency_percentage ?? 0}% eficiência
                      </p>
                    </div>
                  </div>
                  {prod.has_alert && <AlertCircle className="w-5 h-5 text-amber-500" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 text-sm text-slate-600">
        Produção total registrada: <b>{Number(totalProduction || 0).toFixed(0)} kWh</b>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>• Portal mostra status, docs e histórico (se existirem tabelas/dados).</p>
          <p>• Se tabelas não existirem ainda, fica vazio sem quebrar.</p>
        </CardContent>
      </Card>
    </div>
  );
}
