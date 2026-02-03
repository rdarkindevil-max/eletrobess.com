import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles.css";

function uid() {
  return (crypto?.randomUUID?.() || String(Date.now() + Math.random()));
}

function normalizeClient(c) {
  const safe = c || {};
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
    service_category: safe.service_category ?? "",

    cep: safe.cep ?? "",
    address: safe.address ?? "",
    house_number: safe.house_number ?? "",
    neighborhood: safe.neighborhood ?? "",
    city: safe.city ?? "",
    state: safe.state ?? "",

    ufv_consumo_mensal: safe.ufv_consumo_mensal ?? {
      jan: "", fev: "", mar: "", abr: "", mai: "", jun: "",
      jul: "", ago: "", set: "", out: "", nov: "", dez: "",
    },

    ufv_potencia_kwp: safe.ufv_potencia_kwp ?? "",
    ufv_irradiacao: safe.ufv_irradiacao ?? "",
    ufv_roof_type: safe.ufv_roof_type ?? "",
    ufv_rateio: safe.ufv_rateio ?? "",
    ufv_inversores: safe.ufv_inversores ?? "",
    ufv_modulos: safe.ufv_modulos ?? "",

    financeiro_custos: Array.isArray(safe.financeiro_custos) ? safe.financeiro_custos : [
      { id: uid(), tipo: "Equipamentos", valor: "" },
      { id: uid(), tipo: "Serviços", valor: "" },
      { id: uid(), tipo: "Engenharia", valor: "" },
    ],

    financeiro_pagamentos: Array.isArray(safe.financeiro_pagamentos) ? safe.financeiro_pagamentos : [
      { id: uid(), forma: "PIX", pct: 0 },
    ],
  };
}

function formatBRL(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Clients() {
  const initialFormState = normalizeClient({ status: "ENTRADA" });

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState("basico");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);

  // filtros
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fType, setFType] = useState("all");
  const [fOrigin, setFOrigin] = useState("all");

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
      const normalized = (data || []).map((c) => normalizeClient(c));
      setClients(normalized);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, []);

  // CEP
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
    } catch {
      // ignora
    }
  };

  // UFV - CONSUMO
  const consumoValores = useMemo(() => {
    return Object.values(formData.ufv_consumo_mensal || {}).map((v) => Number(v) || 0);
  }, [formData.ufv_consumo_mensal]);

  const consumoAnual = useMemo(() => consumoValores.reduce((a, b) => a + b, 0), [consumoValores]);
  const consumoMedio = useMemo(() => (consumoAnual / 12).toFixed(2), [consumoAnual]);

  // UFV - GERAÇÃO
  const kwp = Number(formData.ufv_potencia_kwp || 0);
  const irradiacao = Number(formData.ufv_irradiacao || 0);
  const geracaoMensal = kwp * irradiacao * 30;
  const geracaoAnual = geracaoMensal * 12;

  // FINANCEIRO
  const custoFornecedor = Number(formData.financeiro_custos.find((c) => c.tipo === "Equipamentos")?.valor || 0);
  const custoServico = Number(formData.financeiro_custos.find((c) => c.tipo === "Serviços")?.valor || 0);
  const custoEngenharia = Number(formData.financeiro_custos.find((c) => c.tipo === "Engenharia")?.valor || 0);

  const fornecedorPorKwp = kwp > 0 ? custoFornecedor / kwp : 0;
  const servicoPorKwp = kwp > 0 ? custoServico / kwp : 0;
  const engenhariaPorKwp = kwp > 0 ? custoEngenharia / kwp : 0;

  const totalPorKwp = fornecedorPorKwp + servicoPorKwp + engenhariaPorKwp;
  const totalEmReais = totalPorKwp * kwp;

  const pagamentos = formData.financeiro_pagamentos || [];
  const totalPct = pagamentos.reduce((s, p) => s + (Number(p.pct) || 0), 0);
  const pctRestante = Math.max(0, 100 - totalPct);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pctOk) {
      alert("As porcentagens precisam fechar em 100%.");
      return;
    }

    setErrMsg("");

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    const payload = {
      ...formData,
      created_by: userId,
      ufv_consumo_mensal: formData.ufv_consumo_mensal || {},
      financeiro_custos: formData.financeiro_custos || [],
      financeiro_pagamentos: formData.financeiro_pagamentos || [],
    };

    if (editingClientId) {
      const { error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", editingClientId);

      if (error) {
        setErrMsg(error.message);
        alert("Erro ao atualizar: " + error.message);
        return;
      }
      alert("Cliente atualizado!");
    } else {
      const { error } = await supabase
        .from("clients")
        .insert(payload);

      if (error) {
        setErrMsg(error.message);
        alert("Erro ao salvar: " + error.message);
        return;
      }
      alert("Cliente adicionado!");
    }

    setFormData(initialFormState);
    setIsFormOpen(false);
    setActiveTab("basico");
    setEditingClientId(null);
    await loadClients();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }
    await loadClients();
  };

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (clients || []).filter((c) => {
      const matchQ =
        !qq ||
        [c?.name, c?.email, c?.contact_number, c?.document, c?.origin, c?.city, c?.state]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(qq));

      const matchStatus = fStatus === "all" || (c?.status || "ENTRADA") === fStatus;
      const matchType = fType === "all" || (c?.type || "") === fType;
      const matchOrigin = fOrigin === "all" || (c?.origin || "") === fOrigin;

      return matchQ && matchStatus && matchType && matchOrigin;
    });
  }, [clients, q, fStatus, fType, fOrigin]);

  const kpis = useMemo(() => {
    const list = filtered || [];
    const total = list.length;
    const entradas = list.filter((c) => (c?.status || "ENTRADA") === "ENTRADA").length;
    const fechados = list.filter((c) => (c?.status || "") === "FECHADO").length;
    const cancelados = list.filter((c) => (c?.status || "") === "CANCELADO").length;
    return { total, entradas, fechados, cancelados };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie clientes, propostas e cadastro completo (UFV/Financeiro).
            </p>
          </div>

          <div className="flex gap-2">
            <button className="btn ghost" type="button">
              Importar Planilha
            </button>
            <button className="btn primary" type="button" onClick={openNew}>
              + Novo Cliente
            </button>
          </div>
        </div>

        {errMsg ? (
          <div className="warn" style={{ marginTop: 12 }}>
            Erro: {errMsg}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, email, documento, cidade..."
                className="input"
              />
            </div>

            <div className="grid w-full grid-cols-2 gap-2 lg:w-auto lg:grid-cols-3">
              <select className="input" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="all">Status (todos)</option>
                <option value="ENTRADA">ENTRADA</option>
                <option value="FECHADO">FECHADO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>

              <select className="input" value={fType} onChange={(e) => setFType(e.target.value)}>
                <option value="all">Tipo (todos)</option>
                <option value="RESIDENCIAL">RESIDENCIAL</option>
                <option value="COMERCIAL">COMERCIAL</option>
                <option value="INDUSTRIAL">INDUSTRIAL</option>
                <option value="RURAL">RURAL</option>
              </select>

              <select className="input" value={fOrigin} onChange={(e) => setFOrigin(e.target.value)}>
                <option value="all">Origem (todas)</option>
                <option value="INDICAÇÃO">INDICAÇÃO</option>
                <option value="TRÁFEGO">TRÁFEGO</option>
                <option value="DIRETO">DIRETO</option>
                <option value="OUTROS">OUTROS</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total de clientes" value={kpis.total} />
          <StatCard title="Entradas" value={kpis.entradas} />
          <StatCard title="Fechados" value={kpis.fechados} />
          <StatCard title="Cancelados" value={kpis.cancelados} />
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Lista</p>
              <p className="text-xs text-muted-foreground">
                {loading ? "Carregando..." : `${filtered.length} resultado(s)`}
              </p>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total (R$)</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                      Carregando clientes...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const statusTxt = c.status || "ENTRADA";
                    const pillClass = String(statusTxt).toLowerCase();

                    const totKwp = (() => {
                      const k = Number(c.ufv_potencia_kwp || 0);
                      const f = Number(c.financeiro_custos?.find((x) => x.tipo === "Equipamentos")?.valor || 0);
                      const s = Number(c.financeiro_custos?.find((x) => x.tipo === "Serviços")?.valor || 0);
                      const e = Number(c.financeiro_custos?.find((x) => x.tipo === "Engenharia")?.valor || 0);
                      if (!k) return 0;
                      return (f / k) + (s / k) + (e / k);
                    })();

                    const total = totKwp * Number(c.ufv_potencia_kwp || 0);

                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium">{c.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{c.email || ""}</div>
                        </td>

                        <td className="px-4 py-3">{c.type || "-"}</td>

                        <td className="px-4 py-3">
                          {c.city || "-"}{c.state ? `/${c.state}` : ""}
                        </td>

                        <td className="px-4 py-3">{c.service_category || "-"}</td>

                        <td className="px-4 py-3">
                          <span className={`pill ${pillClass}`}>{statusTxt}</span>
                        </td>

                        <td className="px-4 py-3 font-medium">{formatBRL(total)}</td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="btn ghost" type="button" onClick={() => openEdit(c)}>
                              Editar
                            </button>
                            <button className="btn danger" type="button" onClick={() => handleDelete(c.id)}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            Dica: use os filtros pra priorizar follow-up e organizar funil comercial.
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
                  <button type="button" className={"tab " + (activeTab === "basico" ? "active" : "")} onClick={() => setActiveTab("basico")}>
                    Básico
                  </button>
                  <button type="button" className={"tab " + (activeTab === "endereco" ? "active" : "")} onClick={() => setActiveTab("endereco")}>
                    Endereço
                  </button>
                  {formData.service_category && (
                    <button type="button" className={"tab " + (activeTab === "nicho" ? "active" : "")} onClick={() => setActiveTab("nicho")}>
                      Nicho
                    </button>
                  )}
                  {formData.service_category && (
                    <button type="button" className={"tab " + (activeTab === "financeiro" ? "active" : "")} onClick={() => setActiveTab("financeiro")}>
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

                    <InputField label="Nome / Razão Social" value={formData.name} onChange={(v) => setField("name", v)} />
                    <InputField label="CPF / CNPJ" value={formData.document} onChange={(v) => setField("document", v)} />

                    <InputField label="E-mail" value={formData.email} onChange={(v) => setField("email", v)} />
                    <InputField label="Telefone" value={formData.contact_number} onChange={(v) => setField("contact_number", v)} />

                    <InputField label="Data de Nascimento / Fundação" type="date" value={formData.birth_date} onChange={(v) => setField("birth_date", v)} />

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
                      <InputField label="Observações" value={formData.observations} onChange={(v) => setField("observations", v)} />
                    </div>

                    <SelectField
                      label="Categoria de Serviço"
                      value={formData.service_category}
                      onChange={(v) => setField("service_category", v)}
                      options={[
                        { value: "UFV", label: "UFV" },
                        { value: "MANUTENCAO", label: "MANUTENCAO" },
                        { value: "ELETROPOSTOS", label: "ELETROPOSTOS" },
                        { value: "BESS", label: "BESS" },
                        { value: "MERCADO_LIVRE", label: "MERCADO_LIVRE" },
                        { value: "SUBESTACAO", label: "SUBESTACAO" },
                        { value: "CFTV", label: "CFTV" },
                        { value: "AR", label: "AR" },
                        { value: "ILUMINACAO", label: "ILUMINACAO" },
                      ]}
                    />
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
                    <InputField label="Endereço" value={formData.address} onChange={(v) => setField("address", v)} />
                    <InputField label="Número" value={formData.house_number} onChange={(v) => setField("house_number", v)} />
                    <InputField label="Bairro" value={formData.neighborhood} onChange={(v) => setField("neighborhood", v)} />
                    <InputField label="Cidade" value={formData.city} onChange={(v) => setField("city", v)} />
                    <InputField label="Estado" value={formData.state} onChange={(v) => setField("state", v)} />
                  </div>
                )}

                {activeTab === "nicho" && (
                  <div className="grid2">
                    {formData.service_category === "UFV" ? (
                      <>
                        <InputField label="Potência do Sistema (kWp)" type="number" value={formData.ufv_potencia_kwp} onChange={(v) => setField("ufv_potencia_kwp", v)} />
                        <InputField label="Irradiação (kWh/m²/dia)" type="number" value={formData.ufv_irradiacao} onChange={(v) => setField("ufv_irradiacao", v)} />

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
                          onChange={(v) => setField("ufv_rateio", v)}
                          options={[
                            { value: "SIM", label: "SIM" },
                            { value: "NÃO", label: "NÃO" },
                          ]}
                        />

                        <div className="full">
                          <label className="label">Consumo Mensal (kWh)</label>
                          <div className="grid3">
                            {Object.entries(formData.ufv_consumo_mensal).map(([mes, val]) => (
                              <input
                                key={mes}
                                className="input"
                                placeholder={mes.toUpperCase()}
                                value={val}
                                onChange={(e) =>
                                  setFormData((p) => ({
                                    ...p,
                                    ufv_consumo_mensal: { ...p.ufv_consumo_mensal, [mes]: e.target.value },
                                  }))
                                }
                              />
                            ))}
                          </div>
                        </div>

                        <ReadOnlyField label="Consumo Anual (kWh)" value={String(consumoAnual)} />
                        <ReadOnlyField label="Média Mensal (kWh)" value={String(consumoMedio)} />
                        <ReadOnlyField label="Geração Mensal Estimada (kWh)" value={String(geracaoMensal.toFixed(2))} />
                        <ReadOnlyField label="Geração Anual Estimada (kWh)" value={String(geracaoAnual.toFixed(2))} />
                      </>
                    ) : (
                      <div className="full" style={{ color: "#64748b" }}>
                        (Campos desse nicho você adiciona depois — UFV já está.)
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
                                financeiro_custos: p.financeiro_custos.map((it) => (it.id === c.id ? { ...it, tipo: e.target.value } : it)),
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
                                financeiro_custos: p.financeiro_custos.map((it) => (it.id === c.id ? { ...it, valor: e.target.value } : it)),
                              }))
                            }
                          />
                          <button
                            className="btn danger"
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, financeiro_custos: p.financeiro_custos.filter((it) => it.id !== c.id) }))}
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
                            financeiro_custos: [...p.financeiro_custos, { id: uid(), tipo: "", valor: "" }],
                          }))
                        }
                      >
                        + Adicionar custo
                      </button>

                      <div className="hr" />

                      <div className="kpis">
                        <div><b>Fornecedor por kWp:</b> R$ {fornecedorPorKwp.toFixed(2)}</div>
                        <div><b>Serviço por kWp:</b> R$ {servicoPorKwp.toFixed(2)}</div>
                        <div><b>Engenharia por kWp:</b> R$ {engenhariaPorKwp.toFixed(2)}</div>
                      </div>

                      <div className="kpiBig">
                        <div><b>Total por kWp (depois da divisão):</b> R$ {totalPorKwp.toFixed(2)}</div>
                        <div className="muted">Total em R$ (Total por kWp × kWp): R$ {totalEmReais.toFixed(2)}</div>
                      </div>
                    </Section>

                    <Section title="Formas de Pagamento (por % — sem parcelas)">
                      <div className="between small">
                        <span>Total: <b>{totalPct}%</b></span>
                        <span>Restante: <b>{pctRestante}%</b></span>
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
                                    financeiro_pagamentos: pagamentos.map((x) => (x.id === p.id ? { ...x, forma: e.target.value } : x)),
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
                                    financeiro_pagamentos: pagamentos.map((x) => (x.id === p.id ? { ...x, pct: e.target.value } : x)),
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
                                onClick={() => setFormData((prev) => ({ ...prev, financeiro_pagamentos: pagamentos.filter((x) => x.id !== p.id) }))}
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
                            financeiro_pagamentos: [...p.financeiro_pagamentos, { id: uid(), forma: "PIX", pct: 0 }],
                          }))
                        }
                      >
                        + Adicionar forma
                      </button>

                      {!pctOk && <div className="warn">As porcentagens precisam fechar em 100%.</div>}
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

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} />
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
      <select className="input" value={value || ""} onChange={(e) => onChange(e.target.value)}>
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
import HCaptcha from "@hcaptcha/react-hcaptcha";


