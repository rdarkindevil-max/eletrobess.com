import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";

import { Zap, AlertCircle, CheckCircle2, Activity, FileText, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { format } from "date-fns";

export default function ClientPortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [clientData, setClientData] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data?.user ?? null);
    })();
  }, []);

  const clientByEmailQuery = useQuery({
    queryKey: ["clientPortalClientByEmail", currentUser?.email],
    enabled: !!currentUser?.email,
    queryFn: async () => {
      const { data: found, error } = await supabase
        .from("clients")
        .select("*")
        .eq("email", currentUser.email)
        .maybeSingle();

      if (error) throw error;
      if (found) return found;

      const { data: created, error: insertErr } = await supabase
        .from("clients")
        .insert({
          email: currentUser.email,
          name: currentUser.email?.split("@")[0] || "",
          status: "ENTRADA",
        })
        .select("*")
        .single();

      if (insertErr) throw insertErr;

      return created;
    },
  });

  useEffect(() => {
    if (clientByEmailQuery.data) {
      setClientData(clientByEmailQuery.data);
    }
  }, [clientByEmailQuery.data]);

  const plantSalesQuery = useQuery({
    queryKey: ["clientPlantSales", clientData?.id],
    enabled: !!clientData?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("plant_sales")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });

      return data ?? [];
    },
  });

  const energyQuery = useQuery({
    queryKey: ["clientEnergyProduction", clientData?.power_plant_id],
    enabled: !!clientData?.power_plant_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("energy_production")
        .select("*")
        .eq("power_plant_id", clientData.power_plant_id)
        .order("date", { ascending: false });

      return data ?? [];
    },
  });

  const documentsQuery = useQuery({
    queryKey: ["clientDocuments", clientData?.id],
    enabled: !!clientData?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("related_entity", "client")
        .eq("related_entity_id", clientData.id)
        .order("created_at", { ascending: false });

      return data ?? [];
    },
  });

  const loading = !currentUser || clientByEmailQuery.isLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!clientData) {
    return <div style={{ padding: 30 }}>Cliente não encontrado.</div>;
  }

  // 🔥 CORREÇÃO ANTI-CRASH (React #310)
  const plantSales = Array.isArray(plantSalesQuery?.data)
    ? plantSalesQuery.data
    : [];

  const energyProduction = Array.isArray(energyQuery?.data)
    ? energyQuery.data
    : [];

  const documents = Array.isArray(documentsQuery?.data)
    ? documentsQuery.data
    : [];

  const latestProduction = energyProduction[0];

  const totalProduction = useMemo(
    () =>
      energyProduction.reduce(
        (sum, p) => sum + (p.production_kwh || 0),
        0
      ),
    [energyProduction]
  );

  const averageEfficiency = useMemo(() => {
    if (!energyProduction.length) return 0;
    return (
      energyProduction.reduce(
        (sum, p) => sum + (p.efficiency_percentage || 0),
        0
      ) / energyProduction.length
    );
  }, [energyProduction]);

  const activeProject = plantSales.find((s) =>
    ["in_progress", "installed", "online", "issue"].includes(s.status)
  );

  const fmt = (d) => {
    try {
      return format(new Date(d), "dd/MM/yyyy");
    } catch {
      return "-";
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Olá, {clientData.name || "Cliente"} 👋
      </h1>

      <div style={{ marginTop: 20 }}>
        Produção total: <b>{totalProduction.toFixed(0)} kWh</b>
      </div>

      <div style={{ marginTop: 10 }}>
        Eficiência média: <b>{averageEfficiency.toFixed(1)}%</b>
      </div>

      <div style={{ marginTop: 20 }}>
        Projetos encontrados: {plantSales.length}
      </div>

      <div style={{ marginTop: 10 }}>
        Documentos encontrados: {documents.length}
      </div>

      {latestProduction && (
        <div style={{ marginTop: 20 }}>
          Última produção: {latestProduction.production_kwh || 0} kWh
        </div>
      )}
    </div>
  );
}
