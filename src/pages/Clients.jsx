import React, { useEffect, useMemo, useState } from "react";
import "../styles.css";

function uid() {
  return (crypto?.randomUUID?.() || String(Date.now() + Math.random()));
}

export default function Clients() {
  const initialFormState = {
    // Básico
    status: "ENTRADA",
    name: "",
    type: "",
    contact_number: "",
    email: "",
    document: "",
    birth_date: "",
    origin: "",
    observations: "",
    service_category: "",

    // Endereço
    cep: "",
    address: "",
    house_number: "",
    neighborhood: "",
    city: "",
    state: "",

    // UFV - Consumo
    ufv_consumo_mensal: {
      jan: "", fev: "", mar: "", abr: "", mai: "", jun: "",
      jul: "", ago: "", set: "", out: "", nov: "", dez: "",
    },

    // UFV - Sistema
    ufv_potencia_kwp: "",
    ufv_irradiacao: "",
    ufv_roof_type: "",
    ufv_rateio: "",
    ufv_inversores: "",
    ufv_modulos: "",

    // Financeiro
    financeiro_custos: [
      { id: uid(), tipo: "Equipamentos", valor: "" },
      { id: uid(), tipo: "Serviços", valor: "" },
      { id: uid(), tipo: "Engenharia", valor: "" },
    ],

    // pagamentos em % (sem parcelas)
    financeiro_pagamentos: [{ id: uid(), forma: "PIX", pct: 0 }],
  };

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [activeTab, setActiveTab] = useState("basico");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState(null);

  // carregar clientes
  useEffect(() => {
    const saved = localStorage.getItem("clients");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const withId = parsed.map((c) => (c.id ? c : { ...c, id: Date.now() + Math.random() }));
        setClients(withId);
      } catch {}
    }
  }, []);

  // salvar clientes
  useEffect(() => {
    localStorage.setItem("clients", JSON.stringify(clients));
  }, [clients]);

  const setField = (key, value) => setFormData((p) => ({ ...p, [key]: value }));

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

  // ===== UFV - CONSUMO
  const consumoValores = useMemo(() => {
    return Object.values(formData.ufv_consumo_mensal || {}).map((v) => Number(v) || 0);
  }, [formData.ufv_consumo_mensal]);

  const consumoAnual = useMemo(() => consumoValores.reduce((a, b) => a + b, 0), [consumoValores]);
  const consumoMedio = useMemo(() => (consumoAnual / 12).toFixed(2), [consumoAnual]);

  // ===== UFV - GERAÇÃO
  const kwp = Number(formData.ufv_potencia_kwp || 0);
  const irradiacao = Number(formData.ufv_irradiacao || 0);
  const geracaoMensal = kwp * irradiacao * 30;
  const geracaoAnual = geracaoMensal * 12;

  // ===== FINANCEIRO
  const custoFornecedor = Number(formData.financeiro_custos.find((c) => c.tipo === "Equipamentos")?.valor || 0);
  const custoServico = Number(formData.financeiro_custos.find((c) => c.tipo === "Serviços")?.valor || 0);
  const custoEngenharia = Number(formData.financeiro_custos.find((c) => c.tipo === "Engenharia")?.valor || 0);

  // divisão por kWp (como você pediu)
  const fornecedorPorKwp = kwp > 0 ? custoFornecedor / kwp : 0;
  const servicoPorKwp = kwp > 0 ? custoServico / kwp : 0;
  const engenhariaPorKwp = kwp > 0 ? custoEngenharia / kwp : 0;

  // ✅ ESTE É O "TOTAL DEPOIS DA DIVISÃO" (total por kWp)
  const totalPorKwp = fornecedorPorKwp + servicoPorKwp + engenhariaPorKwp;

  // total em R$ recomposto (para calcular pagamentos em %)
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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!pctOk) {
      alert("As porcentagens precisam fechar em 100%.");
      return;
    }

    if (editingClientId) {
      setClients((prev) => prev.map((c) => (c.id === editingClientId ? { ...formData, id: editingClientId } : c)));
      setEditingClientId(null);
      alert("Cliente atualizado!");
    } else {
      setClients((prev) => [...prev, { ...formData, id: Date.now() }]);
      alert("Cliente adicionado!");
    }

    setFormData(initialFormState);
    setIsFormOpen(false);
    setActiveTab("basico");
  };

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="title">Clientes</h1>
          <p className="subtitle">Gerencie os clientes da Eletrobess</p>
        </div>

        <div className="actions">
          <button className="btn ghost" type="button">
            Importar Planilha
          </button>
          <button className="btn primary" type="button" onClick={() => setIsFormOpen(true)}>
            + Novo Cliente
          </button>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <div className="cardLabel">Total de Clientes</div>
          <div className="cardValue">{clients.length}</div>
        </div>

        <div className="card">
          <div className="cardLabel">Total por kWp (proposta)</div>
          <div className="cardValue">R$ {totalPorKwp.toFixed(2)}</div>
          <div className="cardHint">Total em R$: {totalEmReais.toFixed(2)}</div>
        </div>

        <div className="card">
          <div className="cardLabel">Consumo Médio</div>
          <div className="cardValue">{consumoMedio} kWh</div>
        </div>
      </div>

      {isFormOpen && (
        <form
          className="panel"
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault(); // ✅ Enter não salva
          }}
        >
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

          {/* BASICO */}
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

          {/* ENDEREÇO */}
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

          {/* NICHO */}
          {activeTab === "nicho" && (
            <div className="grid2">
              {formData.service_category === "UFV" && (
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
              )}

              {formData.service_category !== "UFV" && (
                <div className="full" style={{ color: "#64748b" }}>
                  (Campos desse nicho você adiciona depois — UFV já está.)
                </div>
              )}
            </div>
          )}

          {/* FINANCEIRO */}
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
            <button className="btn ghost" type="button" onClick={() => { setIsFormOpen(false); setEditingClientId(null); }}>
              Cancelar
            </button>

            <button className="btn primary" type="submit" disabled={!pctOk}>
              Salvar Cliente
            </button>
          </div>
        </form>
      )}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Localização</th>
              <th>Categoria</th>
              <th>Status</th>
              <th style={{ width: 140 }}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  Nenhum cliente ainda.
                </td>
              </tr>
            )}

            {clients.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="row">
                    <div className="miniAvatar">{(c.name || "?").slice(0, 1).toUpperCase()}</div>
                    <div>
                      <div className="tName">{c.name || "-"}</div>
                      <div className="tSub">{c.email || ""}</div>
                    </div>
                  </div>
                </td>
                <td>{c.type || "-"}</td>
                <td>{(c.city || "-") + " / " + (c.state || "-")}</td>
                <td>{c.service_category || "-"}</td>
                <td>
                  <span className={"pill " + (c.status || "ENTRADA").toLowerCase()}>{c.status || "ENTRADA"}</span>
                </td>
                <td>
                  <div className="row">
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        setFormData(c);
                        setIsFormOpen(true);
                        setEditingClientId(c.id);
                        setActiveTab("basico");
                      }}
                    >
                      Editar
                    </button>
                    <button className="btn danger" type="button" onClick={() => setClients((prev) => prev.filter((x) => x.id !== c.id))}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="muted small" style={{ marginTop: 10 }}>
          Obs: Pagamentos calculam em cima do Total em R$ (Total por kWp × kWp).
        </div>
      </div>
    </div>
  );
}

/* ===== Componentes simples (HTML) ===== */

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


