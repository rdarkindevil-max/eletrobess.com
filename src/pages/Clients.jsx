import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "../styles.css";

function uid() {
  try {
    return crypto?.randomUUID?.() || String(Date.now() + Math.random());
  } catch {
    return String(Date.now() + Math.random());
  }
}

/**
 * ✅ Consumo mensal:
 * - se vier string JSON, parseia
 * - garante jan..dez
 */
function normalizeConsumoMensal(v) {
  const base = {
    jan: "",
    fev: "",
    mar: "",
    abr: "",
    mai: "",
    jun: "",
    jul: "",
    ago: "",
    set: "",
    out: "",
    nov: "",
    dez: "",
  };

  if (v && typeof v === "object" && !Array.isArray(v)) return { ...base, ...v };

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
        return { ...base, ...parsed };
    } catch {}
  }

  return base;
}

/**
 * ✅ JSONB array:
 * - se vier string, parseia
 * - garante array
 */
function normalizeJsonArray(v, fallback) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return fallback;
}

const SERVICE_OPTIONS = [
  "UFV",
  "MANUTENCAO",
  "ELETROPOSTOS",
  "BESS",
  "MERCADO_LIVRE",
  "SUBESTACAO",
  "CFTV",
  "AR",
  "ILUMINACAO",
];

/**
 * ✅ Categorias:
 * - aceita array
 * - aceita string JSON (ex: '["UFV","MANUTENCAO"]')
 * - aceita string normal/CSV (ex: 'UFV, MANUTENCAO' ou 'UFV')
 */
function normalizeCategories(v) {
  if (Array.isArray(v)) {
    return Array.from(new Set(v.map(String).map((s) => s.trim()).filter(Boolean)));
  }

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];

    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(parsed.map(String).map((x) => x.trim()).filter(Boolean))
        );
      }
    } catch {}

    return Array.from(
      new Set(
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
}

/**
 * ✅ Rateio item:
 */
function normalizeRateioItem(v) {
  const base = {
    id: uid(),
    numero_cliente: "",
    cpf: "",
    pct: "",
    endereco_geradora: "",
    docs: [], // urls
    docs_files: [], // files novos (não vai pro banco)
  };

  if (v && typeof v === "object" && !Array.isArray(v)) {
    return {
      ...base,
      ...v,
      id: v.id || uid(),
      docs: Array.isArray(v.docs) ? v.docs : [],
      docs_files: [],
    };
  }

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          ...base,
          ...parsed,
          id: parsed.id || uid(),
          docs: Array.isArray(parsed.docs) ? parsed.docs : [],
          docs_files: [],
        };
      }
    } catch {}
  }

  return base;
}

function newRateioItem() {
  return normalizeRateioItem({});
}

/**
 * ✅ Upload docs por rateio (cada rateio vai numa pasta):
 * bucket: client-docs
 * path: rateio/<clientId>/<rateioId>/<timestamp>-rand.ext
 * retorna array de URLs públicas
 */
async function uploadRateioDocs({ clientId, rateioId, files }) {
  const list = Array.isArray(files) ? files : [];
  if (!clientId || !rateioId || list.length === 0) return [];

  const uploaded = [];

  for (const file of list) {
    const ext = (file?.name || "").split(".").pop() || "bin";
    const path = `rateio/${clientId}/${rateioId}/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("client-docs")
      .upload(path, file, { upsert: false });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from("client-docs").getPublicUrl(path);
    uploaded.push(data.publicUrl);
  }

  return uploaded;
}

function normalizeClient(c) {
  const safe = c || {};

  // compat: aceita service_categories array/json/string OU service_category antigo
  const categories = normalizeCategories(
    safe.service_categories ?? (safe.service_category ? [safe.service_category] : [])
  );

  // compat: se ainda existir ufv_rateio_dados antigo, converte pra lista
  const legacyRateio =
    safe.ufv_rateio === "SIM" && safe.ufv_rateio_dados
      ? [normalizeRateioItem({ ...safe.ufv_rateio_dados, id: uid() })]
      : [];

  const rateios = normalizeJsonArray(safe.ufv_rateios, legacyRateio).map(
    normalizeRateioItem
  );

  return {
    id: safe.id ?? uid(),
    status: safe.status ?? "ENTRADA",
    name: safe.name ?? "",
    type: safe.type ?? "",
    contact_number: safe.contact_number ?? "",
    email: safe.email ?? "",
    document: safe.document ?? "",
    birth_date: safe.birth_date ?? "",
    origin: safe.origin ?? "",
    observations: safe.observations ?? "",

    // ✅ agora é multi
    service_categories: categories,

    cep: safe.cep ?? "",
    address: safe.address ?? "",
    house_number: safe.house_number ?? "",
    neighborhood: safe.neighborhood ?? "",
    city: safe.city ?? "",
    state: safe.state ?? "",

    ufv_consumo_mensal: normalizeConsumoMensal(safe.ufv_consumo_mensal),

    ufv_potencia_kwp: safe.ufv_potencia_kwp ?? "",
    ufv_irradiacao: safe.ufv_irradiacao ?? "",
    ufv_roof_type: safe.ufv_roof_type ?? "",

    // ✅ SIM/NÃO continua
    ufv_rateio: safe.ufv_rateio ?? "",

    // ✅ multi rateios
    ufv_rateios: rateios,

    ufv_inversores: safe.ufv_inversores ?? "",
    ufv_modulos: safe.ufv_modulos ?? "",

    financeiro_custos: normalizeJsonArray(safe.financeiro_custos, [
      { id: uid(), tipo: "Equipamentos", valor: "" },
      { id: uid(), tipo: "Serviços", valor: "" },
      { id: uid(), tipo: "Engenharia", valor: "" },
    ]),

    financeiro_pagamentos: normalizeJsonArray(safe.financeiro_pagamentos, [
      { id: uid(), forma: "PIX", pct: 0 },
    ]),
  };
}

function formatBRL(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getConsumoMedioCliente(c) {
  const obj = c?.ufv_consumo_mensal || {};
  const vals = Object.values(obj).map((v) => Number(v) || 0);
  const anual = vals.reduce((a, b) => a + b, 0);
  return anual > 0 ? anual / 12 : 0;
}

function getEconomiaCliente(c) {
  const kwp = Number(c?.ufv_potencia_kwp || 0);
  if (!kwp) return 0;

  const f = Number(
    c.financeiro_custos?.find((x) => x.tipo === "Equipamentos")?.valor || 0
  );
  const s = Number(
    c.financeiro_custos?.find((x) => x.tipo === "Serviços")?.valor || 0
  );
  const e = Number(
    c.financeiro_custos?.find((x) => x.tipo === "Engenharia")?.valor || 0
  );

  const totalPorKwp = f / kwp + s / kwp + e / kwp;
  return totalPorKwp * kwp;
}

export default function Clients() {
  const navigate = useNavigate();

  const initialFormState = useMemo(
    () => normalizeClient({ status: "ENTRADA" }),
    []
  );

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState("basico");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);

  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fType, setFType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const setField = (key, value) => setFormData((p) => ({ ...p, [key]: value }));

  const loadClients = async () => {
    setErrMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErrMsg(error.message);
      setClients([]);
    } else {
      setClients((data || []).map((c) => normalizeClient(c)));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAddressByCep = async (cep) => {
    const clean = (cep || "").replace(/\D/g, "");
    if (clean.length !== 8) return;

    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await r.json();
      if (!data.erro) {
        setFormData((p) => ({
          ...p,
          cep: clean,
          address: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));
      }
    } catch {}
  };

  // UFV - CONSUMO
  const consumoValores = useMemo(
    () =>
      Object.values(formData.ufv_consumo_mensal || {}).map(
        (v) => Number(v) || 0
      ),
    [formData.ufv_consumo_mensal]
  );
  const consumoAnual = useMemo(
    () => consumoValores.reduce((a, b) => a + b, 0),
    [consumoValores]
  );
  const consumoMedio = useMemo(
    () => (consumoAnual / 12).toFixed(2),
    [consumoAnual]
  );

  // UFV - GERAÇÃO
  const kwp = Number(formData.ufv_potencia_kwp || 0);
  const irradiacao = Number(formData.ufv_irradiacao || 0);
  const geracaoMensal = kwp * irradiacao * 30;
  const geracaoAnual = geracaoMensal * 12;

  // FINANCEIRO
  const custoFornecedor = Number(
    formData.financeiro_custos.find((c) => c.tipo === "Equipamentos")?.valor ||
      0
  );
  const custoServico = Number(
    formData.financeiro_custos.find((c) => c.tipo === "Serviços")?.valor || 0
  );
  const custoEngenharia = Number(
    formData.financeiro_custos.find((c) => c.tipo === "Engenharia")?.valor || 0
  );

  const fornecedorPorKwp = kwp > 0 ? custoFornecedor / kwp : 0;
  const servicoPorKwp = kwp > 0 ? custoServico / kwp : 0;
  const engenhariaPorKwp = kwp > 0 ? custoEngenharia / kwp : 0;

  const totalPorKwp = fornecedorPorKwp + servicoPorKwp + engenhariaPorKwp;
  const totalEmReais = totalPorKwp * kwp;

  const pagamentos = formData.financeiro_pagamentos || [];
  const totalPct = pagamentos.reduce((s, p) => s + (Number(p.pct) || 0), 0);
  const pctOk = totalPct === 100;

  const pagamentosCalculados = pagamentos.map((p) => {
    const pct = Number(p.pct) || 0;
    const valor = (totalEmReais * pct) / 100;
    return { ...p, pct, valor };
  });

  const openNew = () => {
    setEditingClientId(null);
    setFormData(initialFormState);
    setActiveTab("basico");
    setIsFormOpen(true);
  };

  const openEdit = (c) => {
    const cc = normalizeClient(c);
    setEditingClientId(cc.id);
    setFormData(cc);
    setActiveTab("basico");
    setIsFormOpen(true);
  };

  const categories = useMemo(
    () => normalizeCategories(formData.service_categories),
    [formData.service_categories]
  );

  const hasCategory = categories.length > 0;
  const hasUFV = categories.includes("UFV");

  // ✅ payload limpo (sem id e sem docs_files)
  // ✅ salva service_category (compat) como a 1ª categoria
  const buildPayloadForDb = (fd) => {
    const { id: _ignoreId, ...rest } = fd || {};
    const cats = normalizeCategories(fd.service_categories);

    return {
      ...rest,
      service_categories: cats,
      service_category: cats[0] || "", // ✅ compat com a coluna antiga
      ufv_consumo_mensal: normalizeConsumoMensal(fd.ufv_consumo_mensal),
      financeiro_custos: Array.isArray(fd.financeiro_custos)
        ? fd.financeiro_custos
        : [],
      financeiro_pagamentos: Array.isArray(fd.financeiro_pagamentos)
        ? fd.financeiro_pagamentos
        : [],
      ufv_rateios:
        fd.ufv_rateio === "SIM"
          ? (Array.isArray(fd.ufv_rateios) ? fd.ufv_rateios : []).map(
              ({ docs_files, ...r }) => ({
                ...normalizeRateioItem(r),
                docs_files: undefined,
                docs: Array.isArray(r.docs) ? r.docs : [],
              })
            )
          : [],
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pctOk) {
      alert("As porcentagens precisam fechar em 100%.");
      return;
    }

    setErrMsg("");

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    try {
      const payloadBase = buildPayloadForDb(formData);

      let clientId = editingClientId;

      if (editingClientId) {
        const { created_by, ...updatePayload } = payloadBase;

        const { error: upErr } = await supabase
          .from("clients")
          .update(updatePayload)
          .eq("id", editingClientId);
        if (upErr) throw upErr;
      } else {
        const insertPayload = { ...payloadBase, created_by: userId };

        const { data: inserted, error: insErr } = await supabase
          .from("clients")
          .insert(insertPayload)
          .select("id")
          .single();
        if (insErr) throw insErr;

        clientId = inserted?.id;
      }

      // ✅ upload docs de cada rateio (se SIM)
      if (clientId && formData.ufv_rateio === "SIM") {
        const rateios = Array.isArray(formData.ufv_rateios)
          ? formData.ufv_rateios
          : [];
        let changed = false;

        const nextRateios = [];

        for (const r of rateios) {
          const rr = normalizeRateioItem(r);

          if (Array.isArray(rr.docs_files) && rr.docs_files.length > 0) {
            const newUrls = await uploadRateioDocs({
              clientId,
              rateioId: rr.id,
              files: rr.docs_files,
            });

            rr.docs = [...(Array.isArray(rr.docs) ? rr.docs : []), ...newUrls];
            rr.docs_files = [];
            changed = true;
          } else {
            rr.docs_files = [];
          }

          nextRateios.push(rr);
        }

        // se teve upload, atualiza a coluna ufv_rateios
        if (changed) {
          const toDb = nextRateios.map(({ docs_files, ...r }) => ({
            ...r,
            docs: Array.isArray(r.docs) ? r.docs : [],
          }));

          const { error: upDocsErr } = await supabase
            .from("clients")
            .update({ ufv_rateios: toDb })
            .eq("id", clientId);
          if (upDocsErr) throw upDocsErr;
        }
      }

      alert(editingClientId ? "Cliente atualizado!" : "Cliente adicionado!");
      setFormData(initialFormState);
      setIsFormOpen(false);
      setActiveTab("basico");
      setEditingClientId(null);
      await loadClients();
    } catch (err) {
      const msg = err?.message || "Erro ao salvar";
      setErrMsg(msg);
      alert("Erro ao salvar: " + msg);
    }
  };

  const handleDelete = async (id) => {
    setErrMsg("");
    try {
      const { data, error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;

      if (!data || data.length === 0) {
        const msg =
          "Não deletou (vazio). Normalmente é RLS/policy bloqueando OU id não existe.";
        setErrMsg(msg);
        alert(msg);
        return;
      }
      await loadClients();
    } catch (e) {
      const msg = e?.message || "Erro inesperado ao excluir";
      setErrMsg(msg);
      alert(msg);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (clients || []).filter((c) => {
      const matchQ =
        !qq ||
        [c?.name, c?.email, c?.contact_number, c?.document, c?.origin, c?.city, c?.state]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(qq));

      const matchStatus =
        fStatus === "all" || (c?.status || "ENTRADA") === fStatus;
      const matchType = fType === "all" || (c?.type || "") === fType;

      return matchQ && matchStatus && matchType;
    });
  }, [clients, q, fStatus, fType]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="pageHeader2">
          <div>
            <h1 className="pageTitle2">Clientes</h1>
            <p className="pageSubtitle2">Gerencie os clientes da Eletrobess</p>
          </div>

          <div className="headerActions2">
            <button className="btn primary" type="button" onClick={openNew}>
              + Novo Cliente
            </button>
            {/* <button className="btn ghost" type="button" onClick={handleLogout}>Sair</button> */}
          </div>
        </div>

        {errMsg ? (
          <div className="warn" style={{ marginTop: 12 }}>
            Erro: {errMsg}
          </div>
        ) : null}

        <div className="kpiGrid2">
          <KpiCard icon="👥" title="Total de Clientes" value={filtered.length} />
        </div>

        <div className="searchBar2">
          <div className="searchInputWrap2">
            <span className="searchIcon2">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar clientes..."
              className="searchInput2"
            />
          </div>

          <select
            className="select2"
            value={fType}
            onChange={(e) => setFType(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value="RESIDENCIAL">Residencial</option>
            <option value="COMERCIAL">Comercial</option>
            <option value="INDUSTRIAL">Industrial</option>
            <option value="RURAL">Rural</option>
          </select>

          <select
            className="select2"
            value={fStatus}
            onChange={(e) => setFStatus(e.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="ENTRADA">Entrada</option>
            <option value="FECHADO">Fechado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <div className="tableCard2">
          <div className="tableHead2">
            <div className="tableTitle2">Clientes</div>
            <div className="tableMeta2">
              {loading ? "Carregando..." : `${filtered.length} resultado(s)`}
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="empty2">Carregando clientes...</div>
            ) : filtered.length === 0 ? (
              <div className="empty2">Nenhum cliente encontrado.</div>
            ) : (
              <div className="clientsList">
                {filtered.map((c) => {
                  const statusTxt = c.status || "ENTRADA";
                  const statusKey = String(statusTxt).toLowerCase();
                  const total = getEconomiaCliente(c);
                  const consumo = getConsumoMedioCliente(c);

                  // ✅ normaliza de verdade (array/json/string/csv)
                  const cats = normalizeCategories(
                    c.service_categories ?? c.service_category ?? ""
                  );

                  return (
                    <div key={c.id} className="clientCard2">
                      <div className="clientTop2">
                        <div className="clientLeft2">
                          <div className="avatar2">
                            {(c.name || "C")[0]?.toUpperCase()}
                          </div>

                          <div className="clientText2">
                            <div className="clientName2">{c.name || "-"}</div>
                            <div className="clientEmail2">{c.email || ""}</div>
                          </div>
                        </div>

                        <span className={`badge2 badge-${statusKey}`}>
                          {statusKey === "entrada" ? "Em Andamento" : statusKey}
                        </span>
                      </div>

                      <div className="clientMeta2">
                        <div className="chip2">{c.type || "—"}</div>
                        <div className="chip2">
                          {c.city || "—"}
                          {c.state ? `, ${c.state}` : ""}
                        </div>
                        <div className="chip2">
                          {cats.length ? cats.join(", ") : "—"}
                        </div>
                        <div className="chip2">
                          {consumo ? `${consumo.toFixed(0)} kWh` : "—"}
                        </div>
                        <div className="clientTotal2">
                          {total ? formatBRL(total) : "—"}
                        </div>
                      </div>

                      <div className="clientActions2">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEdit(c);
                          }}
                        >
                          Editar
                        </button>

                        <button
                          className="btn danger"
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!confirm("Excluir este cliente?")) return;
                            handleDelete(c.id);
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            Dica: use os filtros pra priorizar follow-up e organizar funil
            comercial.
          </div>
        </div>

        {isFormOpen && (
          <div style={modalOverlay}>
            <div style={modalCard}>
              <form
                className="panel"
                onSubmit={handleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              >
                <div className="pageHeader" style={{ marginBottom: 8 }}>
                  <div>
                    <h2 className="title" style={{ fontSize: 20, margin: 0 }}>
                      {editingClientId ? "Editar Cliente" : "Novo Cliente"}
                    </h2>
                    <p className="subtitle" style={{ marginTop: 4 }}>
                      Preencha as abas (Básico → Endereço → Nicho → Financeiro).
                    </p>
                  </div>
                  <div className="actions">
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        setEditingClientId(null);
                      }}
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                <div className="tabs">
                  <button
                    type="button"
                    className={"tab " + (activeTab === "basico" ? "active" : "")}
                    onClick={() => setActiveTab("basico")}
                  >
                    Básico
                  </button>
                  <button
                    type="button"
                    className={"tab " + (activeTab === "endereco" ? "active" : "")}
                    onClick={() => setActiveTab("endereco")}
                  >
                    Endereço
                  </button>
                  {hasCategory && (
                    <button
                      type="button"
                      className={"tab " + (activeTab === "nicho" ? "active" : "")}
                      onClick={() => setActiveTab("nicho")}
                    >
                      Nicho
                    </button>
                  )}
                  {hasCategory && (
                    <button
                      type="button"
                      className={"tab " + (activeTab === "financeiro" ? "active" : "")}
                      onClick={() => setActiveTab("financeiro")}
                    >
                      Financeiro
                    </button>
                  )}
                </div>

                {activeTab === "basico" && (
                  <div className="grid2">
                    <SelectField
                      label="Status"
                      value={formData.status}
                      onChange={(v) => setField("status", v)}
                      options={[
                        { value: "ENTRADA", label: "ENTRADA" },
                        { value: "FECHADO", label: "FECHADO" },
                        { value: "CANCELADO", label: "CANCELADO" },
                      ]}
                    />
                    <div />

                    <InputField
                      label="Nome / Razão Social"
                      value={formData.name}
                      onChange={(v) => setField("name", v)}
                    />
                    <InputField
                      label="CPF / CNPJ"
                      value={formData.document}
                      onChange={(v) => setField("document", v)}
                    />

                    <InputField
                      label="E-mail"
                      value={formData.email}
                      onChange={(v) => setField("email", v)}
                    />
                    <InputField
                      label="Telefone"
                      value={formData.contact_number}
                      onChange={(v) => setField("contact_number", v)}
                    />

                    <InputField
                      label="Data de Nascimento / Fundação"
                      type="date"
                      value={formData.birth_date}
                      onChange={(v) => setField("birth_date", v)}
                    />

                    <SelectField
                      label="Tipo de Cliente"
                      value={formData.type}
                      onChange={(v) => setField("type", v)}
                      options={[
                        { value: "RESIDENCIAL", label: "RESIDENCIAL" },
                        { value: "COMERCIAL", label: "COMERCIAL" },
                        { value: "INDUSTRIAL", label: "INDUSTRIAL" },
                        { value: "RURAL", label: "RURAL" },
                      ]}
                    />

                    <SelectField
                      label="Origem da Lead"
                      value={formData.origin}
                      onChange={(v) => setField("origin", v)}
                      options={[
                        { value: "INDICAÇÃO", label: "INDICAÇÃO" },
                        { value: "TRÁFEGO", label: "TRÁFEGO" },
                        { value: "DIRETO", label: "DIRETO" },
                        { value: "OUTROS", label: "OUTROS" },
                      ]}
                    />

                    <div />

                    <div className="full">
                      <InputField
                        label="Observações"
                        value={formData.observations}
                        onChange={(v) => setField("observations", v)}
                      />
                    </div>

                    {/* ✅ MULTI CATEGORIAS (com botão ADD + remover) */}
                    <div className="full">
                      <label className="label">Categoria(s) de Serviço</label>

                      {(formData.service_categories || []).map((cat, i) => (
                        <div
                          key={i}
                          className="row3"
                          style={{ marginBottom: 8, alignItems: "center" }}
                        >
                          <select
                            className="input"
                            value={cat || ""}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                service_categories: (p.service_categories || []).map(
                                  (x, idx) => (idx === i ? e.target.value : x)
                                ),
                              }))
                            }
                          >
                            <option value="">Selecione</option>
                            {SERVICE_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="btn danger"
                            onClick={() =>
                              setFormData((p) => ({
                                ...p,
                                service_categories: (p.service_categories || []).filter(
                                  (_, idx) => idx !== i
                                ),
                              }))
                            }
                          >
                            X
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            service_categories: [...(p.service_categories || []), ""],
                          }))
                        }
                      >
                        + Adicionar categoria
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "endereco" && (
                  <div className="grid2">
                    <InputField
                      label="CEP"
                      value={formData.cep}
                      onChange={(v) => {
                        setField("cep", v);
                        fetchAddressByCep(v);
                      }}
                    />
                    <InputField
                      label="Endereço"
                      value={formData.address}
                      onChange={(v) => setField("address", v)}
                    />
                    <InputField
                      label="Número"
                      value={formData.house_number}
                      onChange={(v) => setField("house_number", v)}
                    />
                    <InputField
                      label="Bairro"
                      value={formData.neighborhood}
                      onChange={(v) => setField("neighborhood", v)}
                    />
                    <InputField
                      label="Cidade"
                      value={formData.city}
                      onChange={(v) => setField("city", v)}
                    />
                    <InputField
                      label="Estado"
                      value={formData.state}
                      onChange={(v) => setField("state", v)}
                    />
                  </div>
                )}

                {activeTab === "nicho" && (
                  <div className="grid2">
                    {hasUFV ? (
                      <>
                        <InputField
                          label="Potência do Sistema (kWp)"
                          type="number"
                          value={formData.ufv_potencia_kwp}
                          onChange={(v) => setField("ufv_potencia_kwp", v)}
                        />
                        <InputField
                          label="Irradiação (kWh/m²/dia)"
                          type="number"
                          value={formData.ufv_irradiacao}
                          onChange={(v) => setField("ufv_irradiacao", v)}
                        />

                        <SelectField
                          label="Tipos de Telhado"
                          value={formData.ufv_roof_type}
                          onChange={(v) => setField("ufv_roof_type", v)}
                          options={[
                            { value: "Fibrocimento", label: "Fibrocimento" },
                            { value: "Cerâmica", label: "Cerâmica" },
                            { value: "Sanduíche", label: "Sanduíche" },
                            { value: "Chapa Metálica", label: "Chapa Metálica" },
                            { value: "Laje", label: "Laje" },
                            { value: "Solo", label: "Solo" },
                            { value: "CARPORT", label: "CARPORT" },
                          ]}
                        />

                        <SelectField
                          label="Opção de Rateio"
                          value={formData.ufv_rateio}
                          onChange={(v) => {
                            setField("ufv_rateio", v);
                            if (v !== "SIM") {
                              setFormData((p) => ({ ...p, ufv_rateios: [] }));
                            } else {
                              setFormData((p) => ({
                                ...p,
                                ufv_rateios:
                                  (p.ufv_rateios || []).length
                                    ? p.ufv_rateios
                                    : [newRateioItem()],
                              }));
                            }
                          }}
                          options={[
                            { value: "SIM", label: "SIM" },
                            { value: "NÃO", label: "NÃO" },
                          ]}
                        />

                        {/* ✅ MULTI RATEIOS (com botão ADD) */}
                        {formData.ufv_rateio === "SIM" && (
                          <div className="full" style={{ marginTop: 10 }}>
                            <div className="section">
                              <div className="sectionTitle">Rateios</div>
                              <div className="sectionBody">
                                {(formData.ufv_rateios || []).map((r, idx) => (
                                  <div
                                    key={r.id}
                                    style={{
                                      border: "1px solid #e5e7eb",
                                      borderRadius: 12,
                                      padding: 12,
                                      marginBottom: 12,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 10,
                                      }}
                                    >
                                      <b>Rateio #{idx + 1}</b>
                                      <button
                                        type="button"
                                        className="btn danger"
                                        onClick={() =>
                                          setFormData((p) => ({
                                            ...p,
                                            ufv_rateios: (p.ufv_rateios || []).filter(
                                              (x) => x.id !== r.id
                                            ),
                                          }))
                                        }
                                      >
                                        Remover
                                      </button>
                                    </div>

                                    <div className="grid2">
                                      <InputField
                                        label="Número do cliente"
                                        value={r.numero_cliente}
                                        onChange={(v) =>
                                          setFormData((p) => ({
                                            ...p,
                                            ufv_rateios: (p.ufv_rateios || []).map((x) =>
                                              x.id === r.id
                                                ? { ...x, numero_cliente: v }
                                                : x
                                            ),
                                          }))
                                        }
                                      />

                                      <InputField
                                        label="CPF"
                                        value={r.cpf}
                                        onChange={(v) =>
                                          setFormData((p) => ({
                                            ...p,
                                            ufv_rateios: (p.ufv_rateios || []).map((x) =>
                                              x.id === r.id ? { ...x, cpf: v } : x
                                            ),
                                          }))
                                        }
                                      />

                                      <InputField
                                        label="% do rateio"
                                        type="number"
                                        value={r.pct}
                                        onChange={(v) =>
                                          setFormData((p) => ({
                                            ...p,
                                            ufv_rateios: (p.ufv_rateios || []).map((x) =>
                                              x.id === r.id ? { ...x, pct: v } : x
                                            ),
                                          }))
                                        }
                                      />

                                      <InputField
                                        label="Endereço da geradora"
                                        value={r.endereco_geradora}
                                        onChange={(v) =>
                                          setFormData((p) => ({
                                            ...p,
                                            ufv_rateios: (p.ufv_rateios || []).map((x) =>
                                              x.id === r.id
                                                ? { ...x, endereco_geradora: v }
                                                : x
                                            ),
                                          }))
                                        }
                                      />

                                      <div className="full">
                                        <label className="label">
                                          Foto dos documentos
                                        </label>
                                        <input
                                          className="input"
                                          type="file"
                                          accept="image/*,application/pdf"
                                          multiple
                                          onChange={(e) => {
                                            const files = Array.from(
                                              e.target.files || []
                                            );
                                            setFormData((p) => ({
                                              ...p,
                                              ufv_rateios: (p.ufv_rateios || []).map((x) =>
                                                x.id === r.id
                                                  ? { ...x, docs_files: files }
                                                  : x
                                              ),
                                            }));
                                          }}
                                        />

                                        {Array.isArray(r.docs) && r.docs.length > 0 && (
                                          <div
                                            style={{
                                              marginTop: 10,
                                              display: "flex",
                                              gap: 8,
                                              flexWrap: "wrap",
                                            }}
                                          >
                                            {r.docs.map((url) => (
                                              <a
                                                key={url}
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn ghost"
                                                style={{ height: 34 }}
                                              >
                                                Ver doc
                                              </a>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                <button
                                  type="button"
                                  className="btn ghost"
                                  onClick={() =>
                                    setFormData((p) => ({
                                      ...p,
                                      ufv_rateios: [
                                        ...(p.ufv_rateios || []),
                                        newRateioItem(),
                                      ],
                                    }))
                                  }
                                >
                                  + Adicionar rateio
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="full">
                          <label className="label">Consumo Mensal (kWh)</label>

                          <div className="grid3">
                            {Object.entries(formData.ufv_consumo_mensal).map(
                              ([mes, val]) => (
                                <div
                                  key={mes}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      letterSpacing: 0.6,
                                      color: "#000",
                                      opacity: 1,
                                      textTransform: "uppercase",
                                      paddingLeft: 2,
                                    }}
                                  >
                                    {mes.toUpperCase()}
                                  </div>

                                  <input
                                    className="input"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={val}
                                    onChange={(e) =>
                                      setFormData((p) => ({
                                        ...p,
                                        ufv_consumo_mensal: {
                                          ...p.ufv_consumo_mensal,
                                          [mes]: e.target.value.replace(/[^\d]/g, ""),
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <ReadOnlyField
                          label="Consumo Anual (kWh)"
                          value={String(consumoAnual)}
                        />
                        <ReadOnlyField
                          label="Média Mensal (kWh)"
                          value={String(consumoMedio)}
                        />
                        <ReadOnlyField
                          label="Geração Mensal Estimada (kWh)"
                          value={String(geracaoMensal.toFixed(2))}
                        />
                        <ReadOnlyField
                          label="Geração Anual Estimada (kWh)"
                          value={String(geracaoAnual.toFixed(2))}
                        />
                      </>
                    ) : (
                      <div className="full" style={{ color: "#64748b" }}>
                        (Selecione UFV nas categorias para aparecer este nicho.)
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "financeiro" && (
                  <div className="stack">
                    <Section title="Custos do Sistema (R$)">
                      {formData.financeiro_custos.map((c) => (
                        <div key={c.id} className="row3">
                          <input
                            className="input"
                            value={c.tipo}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                financeiro_custos: p.financeiro_custos.map((it) =>
                                  it.id === c.id ? { ...it, tipo: e.target.value } : it
                                ),
                              }))
                            }
                          />
                          <input
                            className="input"
                            type="number"
                            placeholder="Valor"
                            value={c.valor}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                financeiro_custos: p.financeiro_custos.map((it) =>
                                  it.id === c.id ? { ...it, valor: e.target.value } : it
                                ),
                              }))
                            }
                          />
                          <button
                            className="btn danger"
                            type="button"
                            onClick={() =>
                              setFormData((p) => ({
                                ...p,
                                financeiro_custos: p.financeiro_custos.filter(
                                  (it) => it.id !== c.id
                                ),
                              }))
                            }
                          >
                            X
                          </button>
                        </div>
                      ))}

                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            financeiro_custos: [
                              ...p.financeiro_custos,
                              { id: uid(), tipo: "", valor: "" },
                            ],
                          }))
                        }
                      >
                        + Adicionar custo
                      </button>

                      <div className="hr" />

                      <div className="kpis">
                        <div>
                          <b>Fornecedor por kWp:</b> R$ {fornecedorPorKwp.toFixed(2)}
                        </div>
                        <div>
                          <b>Serviço por kWp:</b> R$ {servicoPorKwp.toFixed(2)}
                        </div>
                        <div>
                          <b>Engenharia por kWp:</b> R$ {engenhariaPorKwp.toFixed(2)}
                        </div>
                      </div>

                      <div className="kpiBig">
                        <div style={{ color: "#000000" }}>
                          <b>Total por kWp (depois da divisão):</b> R$ {totalPorKwp.toFixed(2)}
                        </div>
                        <div style={{ color: "#000000" }}>
                          <b>Total em R$ (Total por kWp × kWp):</b> R$ {totalEmReais.toFixed(2)}
                        </div>
                      </div>
                    </Section>

                    <Section title="Formas de Pagamento (por % — sem parcelas)">
                      <div className="between small">
                        <span>
                          Total: <b>{totalPct}%</b>
                        </span>
                        <span>
                          Restante: <b>{Math.max(0, 100 - totalPct)}%</b>
                        </span>
                      </div>

                      {pagamentosCalculados.map((p) => (
                        <div key={p.id} className="payItem">
                          <div className="payGrid">
                            <div>
                              <label className="label">Forma</label>
                              <select
                                className="input"
                                value={p.forma}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    financeiro_pagamentos: pagamentos.map((x) =>
                                      x.id === p.id ? { ...x, forma: e.target.value } : x
                                    ),
                                  }))
                                }
                              >
                                <option value="PIX">PIX</option>
                                <option value="CARTAO">Cartão</option>
                                <option value="BOLETO">Boleto</option>
                              </select>
                            </div>

                            <div>
                              <label className="label">%</label>
                              <input
                                className="input"
                                type="number"
                                value={p.pct}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    financeiro_pagamentos: pagamentos.map((x) =>
                                      x.id === p.id ? { ...x, pct: e.target.value } : x
                                    ),
                                  }))
                                }
                              />
                            </div>

                            <div>
                              <label className="label">Valor (R$)</label>
                              <input className="input" value={p.valor.toFixed(2)} readOnly />
                            </div>

                            <div className="payDel">
                              <button
                                className="btn danger"
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    financeiro_pagamentos: pagamentos.filter((x) => x.id !== p.id),
                                  }))
                                }
                              >
                                X
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() =>
                          setFormData((p) => ({
                            ...p,
                            financeiro_pagamentos: [
                              ...p.financeiro_pagamentos,
                              { id: uid(), forma: "PIX", pct: 0 },
                            ],
                          }))
                        }
                      >
                        + Adicionar forma
                      </button>

                      {!pctOk && (
                        <div className="warn">As porcentagens precisam fechar em 100%.</div>
                      )}
                    </Section>
                  </div>
                )}

                <div className="formFooter">
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingClientId(null);
                    }}
                  >
                    Cancelar
                  </button>

                  <button className="btn primary" type="submit" disabled={!pctOk}>
                    Salvar Cliente
                  </button>
                </div>

                <div className="muted small" style={{ marginTop: 10 }}>
                  Obs: Pagamentos calculam em cima do Total em R$ (Total por kWp × kWp).
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, title, value }) {
  return (
    <div className="kpiCard2">
      <div className="kpiIcon2">{icon}</div>
      <div>
        <div className="kpiLabel2">{title}</div>
        <div className="kpiValue2">{value}</div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value || ""} readOnly />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Selecione</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="section">
      <div className="sectionTitle">{title}</div>
      <div className="sectionBody">{children}</div>
    </div>
  );
}

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: 24,
  zIndex: 9999,
};

const modalCard = {
  width: "min(1100px, 100%)",
  maxHeight: "calc(100vh - 48px)",
  overflow: "auto",
  background: "transparent",
};
