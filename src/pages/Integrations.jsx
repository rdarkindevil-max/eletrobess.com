// src/pages/Integrations.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles.css";

/**
 * Cada PROVEDOR define quais campos aparecem no "Adicionar credencial".
 * Assim você consegue ter Sungrow com AppKey/AppSecret e outros só user/senha.
 */
const PROVIDERS = [
  {
    key: "solarman",
    name: "Solarman Business",
    badge: "Popular",
    logoText: "S",
    fields: ["username", "password", "apiKey", "baseUrl", "note"],
  },
  {
    key: "solis",
    name: "Solis Cloud",
    badge: "Popular",
    logoText: "S",
    fields: ["username", "password", "apiKey", "baseUrl", "note"],
  },
  {
    key: "hoymiles",
    name: "Hoymiles",
    badge: "Popular",
    logoText: "H",
    fields: ["username", "password", "apiKey", "baseUrl", "note"],
  },
  {
    key: "sungrow",
    name: "Sungrow API",
    badge: "",
    logoText: "S",
    fields: ["username", "password", "appKey", "appSecret", "note"],
  },
  {
    key: "growatt",
    name: "Growatt Server",
    badge: "Popular",
    logoText: "G",
    fields: ["username", "password", "apiKey", "baseUrl", "note"],
  },
  {
    key: "fronius",
    name: "Fronius",
    badge: "",
    logoText: "F",
    fields: ["username", "password", "apiKey", "baseUrl", "note"],
  },
  {
    key: "goodwe",
    name: "GoodWe",
    badge: "",
    logoText: "G",
    fields: ["username", "password", "apiKey", "baseUrl", "note"],
  },
  {
    key: "fimer",
    name: "Fimer",
    badge: "",
    logoText: "F",
    fields: ["username", "password", "apiKey", "baseUrl", "note"],
  },
  {
    key: "nep",
    name: "NEP Viewer",
    badge: "",
    logoText: "N",
    fields: ["username", "password", "apiKey", "baseUrl", "note"],
  },
];

function emptyForm() {
  return {
    credential_name: "",
    username: "",
    password: "",
    apiKey: "",
    baseUrl: "",
    appKey: "",
    appSecret: "",
    note: "",
  };
}

function maskEmailOrUser(s = "") {
  if (!s) return "";
  // se for email, mascara meio
  if (s.includes("@")) {
    const [a, b] = s.split("@");
    if (a.length <= 2) return `**@${b}`;
    return `${a.slice(0, 2)}***@${b}`;
  }
  if (s.length <= 3) return "***";
  return `${s.slice(0, 2)}***`;
}

export default function Integrations() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // linhas da tabela integrations (cada linha = uma credencial)
  const [items, setItems] = useState([]);

  // UI filtros
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all"); // all | active | inactive | popular

  // modal/provider
  const [open, setOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]?.key || "solis");

  // credencial selecionada (para sync)
  const [selectedCredentialId, setSelectedCredentialId] = useState(null);

  // add/edit form
  const [editing, setEditing] = useState(null); // row (integration)
  const [form, setForm] = useState(emptyForm());

  async function getUserId() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  }

  async function load() {
    setErr("");
    setLoading(true);

    const userId = await getUserId();
    if (!userId) {
      setErr("Usuário não autenticado.");
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setItems([]);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // ===== Resumo por provider (para renderizar cards do “catálogo”) =====
  const providerCards = useMemo(() => {
    const byProvider = new Map();
    for (const p of PROVIDERS) byProvider.set(p.key, []);

    for (const row of items) {
      if (!byProvider.has(row.provider)) byProvider.set(row.provider, []);
      byProvider.get(row.provider).push(row);
    }

    return PROVIDERS.map((p) => {
      const creds = byProvider.get(p.key) || [];
      const active = creds.filter((c) => c.status === "connected").length;
      const inactive = creds.filter((c) => c.status !== "connected").length;
      const anyConnected = active > 0;

      // status "macro" do card
      const macroStatus = anyConnected ? "connected" : (creds.length ? "disconnected" : "disconnected");

      const lastSync = creds
        .map((c) => c.last_sync_at)
        .filter(Boolean)
        .sort()
        .slice(-1)[0] || null;

      return {
        ...p,
        creds,
        activeCount: active,
        inactiveCount: inactive,
        macroStatus,
        lastSync,
      };
    });
  }, [items]);

  const filteredCards = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return providerCards.filter((x) => {
      const matchQ =
        !qq ||
        x.name.toLowerCase().includes(qq) ||
        x.key.toLowerCase().includes(qq);

      const isActive = x.activeCount > 0;
      const isInactive = x.activeCount === 0;
      const isPopular = !!x.badge;

      const matchTab =
        tab === "all" ||
        (tab === "active" && isActive) ||
        (tab === "inactive" && isInactive) ||
        (tab === "popular" && isPopular);

      return matchQ && matchTab;
    });
  }, [providerCards, q, tab]);

  function openProvider(pKey) {
    setSelectedProvider(pKey);
    setOpen(true);
    setEditing(null);
    setForm(emptyForm());
    setSelectedCredentialId(null);
  }

  const selectedProviderMeta = useMemo(
    () => PROVIDERS.find((p) => p.key === selectedProvider) || PROVIDERS[0],
    [selectedProvider]
  );

  const providerCredentials = useMemo(() => {
    return items
      .filter((x) => x.provider === selectedProvider)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [items, selectedProvider]);

  function startAddCredential() {
    setEditing(null);
    setForm({
      ...emptyForm(),
      credential_name: selectedProviderMeta?.name || selectedProvider,
    });
  }

  function startEditCredential(row) {
    setEditing(row);
    setForm({
      ...emptyForm(),
      credential_name: row.display_name || selectedProviderMeta?.name || selectedProvider,
      ...(row.credentials || {}),
    });
    setSelectedCredentialId(row.id);
  }

  async function saveCredential() {
    setErr("");
    const userId = await getUserId();
    if (!userId) return setErr("Usuário não autenticado.");

    const payload = {
      user_id: userId,
      provider: selectedProvider,
      display_name: form.credential_name || selectedProviderMeta?.name || selectedProvider,
      status: "connected",
      credentials: {
        credential_name: form.credential_name || "",
        username: form.username || "",
        password: form.password || "",
        apiKey: form.apiKey || "",
        baseUrl: form.baseUrl || "",
        appKey: form.appKey || "",
        appSecret: form.appSecret || "",
        note: form.note || "",
      },
      error_message: null,
      last_sync_at: null,
    };

    if (editing?.id) {
      const { error } = await supabase.from("integrations").update(payload).eq("id", editing.id);
      if (error) return setErr(error.message);
    } else {
      const { error } = await supabase.from("integrations").insert(payload);
      if (error) return setErr(error.message);
    }

    await load();
    // mantém modal aberto e seleciona última credencial
    setEditing(null);
    setForm(emptyForm());
  }

  async function disconnectCredential(row) {
    setErr("");
    const ok = confirm(`Desconectar "${row.display_name}"?`);
    if (!ok) return;

    const { error } = await supabase
      .from("integrations")
      .update({ status: "disconnected", error_message: null })
      .eq("id", row.id);

    if (error) return setErr(error.message);
    await load();
  }

  async function deleteCredential(row) {
    setErr("");
    const ok = confirm(`Apagar credencial "${row.display_name}"?\n(Isso não apaga usinas já importadas)`);
    if (!ok) return;

    const { error } = await supabase.from("integrations").delete().eq("id", row.id);
    if (error) return setErr(error.message);
    await load();
  }

  // ===== Sync MVP (fake) - cria plants dummy e marca last_sync =====
  async function syncCredential(row) {
    setErr("");
    const userId = await getUserId();
    if (!userId) return setErr("Usuário não autenticado.");

    // se disconnected, trava
    if (row.status !== "connected") {
      alert("Conecte a credencial antes de sincronizar.");
      return;
    }

    // cria plants fake se não tiver nenhuma
    const { data: plantsExisting } = await supabase
      .from("plants")
      .select("id")
      .eq("user_id", userId)
      .eq("integration_id", row.id)
      .limit(1);

    if (!plantsExisting || plantsExisting.length === 0) {
      const dummy = [
        {
          user_id: userId,
          integration_id: row.id,
          external_id: `${row.provider}-001`,
          name: `Usina ${row.display_name} A`,
          city: "Niterói",
          state: "RJ",
          capacity_kwp: 9.2,
          status: "ok",
          metrics: { pr_month: 0.82, pr_year: 1.09 },
        },
        {
          user_id: userId,
          integration_id: row.id,
          external_id: `${row.provider}-002`,
          name: `Usina ${row.display_name} B`,
          city: "São Gonçalo",
          state: "RJ",
          capacity_kwp: 51.17,
          status: "warning",
          metrics: { pr_month: 0.68, pr_year: 0.95 },
        },
      ];

      const { error: insErr } = await supabase.from("plants").insert(dummy);
      if (insErr) return setErr(insErr.message);
    }

    const { error } = await supabase
      .from("integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        status: "connected",
        error_message: null,
      })
      .eq("id", row.id);

    if (error) return setErr(error.message);

    await load();
    alert("Sincronização concluída (modo MVP). Agora vá em Usinas.");
  }

  function Pill({ type, children }) {
    const cls =
      type === "ok"
        ? "pill pill-ok"
        : type === "warn"
        ? "pill pill-warn"
        : type === "err"
        ? "pill pill-err"
        : "pill pill-off";
    return <span className={cls}>{children}</span>;
  }

  function Field({ label, type = "text", value, onChange, placeholder }) {
    return (
      <div className="fItem">
        <label className="fLabel">{label}</label>
        <input
          className="fInput"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
    );
  }

  function renderProviderFields() {
    const fields = selectedProviderMeta?.fields || [];

    return (
      <div className="formGrid">
        <Field
          label="Nome da credencial"
          value={form.credential_name || ""}
          onChange={(e) => setForm((p) => ({ ...p, credential_name: e.target.value }))}
          placeholder={`ex: ${selectedProviderMeta?.name} - Cliente X`}
        />

        {fields.includes("username") && (
          <Field
            label="Nome de usuário"
            value={form.username || ""}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            placeholder="ex: email@provedor.com"
          />
        )}

        {fields.includes("password") && (
          <Field
            label="Senha"
            type="password"
            value={form.password || ""}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="••••••••"
          />
        )}

        {fields.includes("apiKey") && (
          <Field
            label="API Key / Token"
            value={form.apiKey || ""}
            onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))}
            placeholder="token..."
          />
        )}

        {fields.includes("baseUrl") && (
          <Field
            label="Base URL (opcional)"
            value={form.baseUrl || ""}
            onChange={(e) => setForm((p) => ({ ...p, baseUrl: e.target.value }))}
            placeholder="https://api..."
          />
        )}

        {fields.includes("appKey") && (
          <Field
            label="App Key"
            value={form.appKey || ""}
            onChange={(e) => setForm((p) => ({ ...p, appKey: e.target.value }))}
            placeholder="app key"
          />
        )}

        {fields.includes("appSecret") && (
          <Field
            label="App Secret"
            value={form.appSecret || ""}
            onChange={(e) => setForm((p) => ({ ...p, appSecret: e.target.value }))}
            placeholder="app secret"
          />
        )}

        {fields.includes("note") && (
          <div className="fItem fFull">
            <label className="fLabel">Observação</label>
            <input
              className="fInput"
              value={form.note || ""}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="ex: cliente X / contrato Y"
              autoComplete="off"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pageDark">
      <div className="intHeader">
        <div>
          <h1 className="intTitle">Integrações</h1>
          <p className="intSub">Integre suas usinas e monitore produção, alertas e performance.</p>
        </div>

        <div className="intHeaderRight">
          <div className="intSearch">
            <span>🔎</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar integração..." />
          </div>

          <div className="intTabs">
            <button className={tab === "all" ? "tabBtn on" : "tabBtn"} onClick={() => setTab("all")}>
              Todas
            </button>
            <button className={tab === "active" ? "tabBtn on" : "tabBtn"} onClick={() => setTab("active")}>
              Ativas
            </button>
            <button className={tab === "inactive" ? "tabBtn on" : "tabBtn"} onClick={() => setTab("inactive")}>
              Inativas
            </button>
            <button className={tab === "popular" ? "tabBtn on" : "tabBtn"} onClick={() => setTab("popular")}>
              Mais populares
            </button>
          </div>
        </div>
      </div>

      {err ? <div className="intAlert">Erro: {err}</div> : null}

      <div className="intSectionTitle">Monitoramento Solar</div>
      <div className="intSectionSub">Integre suas usinas e monitore a produção de energia.</div>

      {loading ? (
        <div className="muted">Carregando integrações...</div>
      ) : (
        <div className="intGrid">
          {filteredCards.map((p) => {
            const anyConn = p.activeCount > 0;
            return (
              <div key={p.key} className="intCard">
                <div className="intCardTop">
                  <div className="intLogo">{p.logoText || p.name?.[0]}</div>
                  <div className="intCardInfo">
                    <div className="intCardName">
                      {p.name} {p.badge ? <span className="pill pill-pop">{p.badge}</span> : null}
                    </div>
                    <div className="intCardMeta">
                      <Pill type={anyConn ? "ok" : "off"}>{anyConn ? "Integrado" : "Inativo"}</Pill>
                      <span className="muted small">
                        Credenciais: {p.creds.length} / Ativas: {p.activeCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="intCardBottom">
                  <button className="btnDark ghost" onClick={() => openProvider(p.key)} type="button">
                    Gerenciar credenciais
                  </button>

                  <button
                    className="btnDark primary"
                    onClick={() => openProvider(p.key)}
                    type="button"
                    title="Abra para escolher qual credencial sincronizar"
                  >
                    Sincronizar usinas
                  </button>
                </div>

                <div className="intCardFooter">
                  {p.lastSync ? (
                    <span className="muted small">Sincronizado: {new Date(p.lastSync).toLocaleString("pt-BR")}</span>
                  ) : (
                    <span className="muted small">Nunca sincronizado</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== MODAL ===== */}
      {open && (
        <div className="intModalOverlay" onMouseDown={() => setOpen(false)}>
          <div className="intModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="intModalHeader">
              <div className="intModalHeaderLeft">
                <div className="intModalProviderName">{selectedProviderMeta?.name}</div>
                <div className="muted small">Gerencie credenciais e sincronize as usinas desse provedor.</div>
              </div>
              <button className="xBtn" onClick={() => setOpen(false)} type="button">
                ✕
              </button>
            </div>

            <div className="intModalBody">
              {/* LEFT */}
              <div className="intPanel">
                <div className="intPanelTitle">Gerenciar credenciais</div>

                {providerCredentials.length === 0 ? (
                  <div className="muted small" style={{ marginTop: 10 }}>
                    Nenhuma credencial cadastrada.
                  </div>
                ) : (
                  <div className="credList">
                    {providerCredentials.map((row) => {
                      const c = row.credentials || {};
                      const active = row.status === "connected";
                      const selected = selectedCredentialId === row.id;

                      return (
                        <button
                          key={row.id}
                          className={selected ? "credItem on" : "credItem"}
                          type="button"
                          onClick={() => {
                            setSelectedCredentialId(row.id);
                            setEditing(null);
                            setForm(emptyForm());
                          }}
                        >
                          <div className="credTop">
                            <div className="credName">{row.display_name || selectedProviderMeta?.name}</div>
                            <Pill type={active ? "ok" : "off"}>{active ? "Integrado" : "Inativo"}</Pill>
                          </div>
                          <div className="credSub muted small">
                            {maskEmailOrUser(c.username)} •{" "}
                            {row.last_sync_at ? `Sync: ${new Date(row.last_sync_at).toLocaleString("pt-BR")}` : "Nunca sync"}
                          </div>

                          <div className="credActions">
                            <span className="miniBtn" onClick={(e) => (e.stopPropagation(), startEditCredential(row))}>
                              ⚙ Editar
                            </span>
                            <span
                              className="miniBtn"
                              onClick={(e) => (e.stopPropagation(), disconnectCredential(row))}
                            >
                              ⛔ Desconectar
                            </span>
                            <span className="miniBtn danger" onClick={(e) => (e.stopPropagation(), deleteCredential(row))}>
                              🗑 Apagar
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button className="btnDark primary wide" type="button" onClick={startAddCredential} style={{ marginTop: 12 }}>
                  + Adicionar credencial
                </button>

                <div className="intResources">
                  <div className="intPanelTitle" style={{ marginTop: 18 }}>
                    Recursos
                  </div>
                  <div className="resItem">📊 Sincronização de usinas</div>
                  <div className="resItem">📈 Atualização automática de dados</div>
                  <div className="resItem">🚨 Monitoramento de alertas</div>
                  <div className="resItem">⚡ Monitoramento de inversores</div>
                  <div className="resItem">🧾 Relatórios de performance</div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="intPanel">
                <div className="intPanelTitle">{editing?.id ? "Editar credencial" : "Adicionar credencial"}</div>

                {renderProviderFields()}

                <div className="intFormActions">
                  <button className="btnDark ghost" type="button" onClick={() => (setEditing(null), setForm(emptyForm()))}>
                    Cancelar
                  </button>
                  <button className="btnDark primary" type="button" onClick={saveCredential}>
                    {editing?.id ? "Salvar alterações" : "Adicionar credencial"}
                  </button>
                </div>

                <div className="muted small" style={{ marginTop: 12 }}>
                  MVP: isso salva credenciais em <b>integrations.credentials</b>. Depois a gente move segredo pra Edge Function/Vault.
                </div>

                <div className="syncBox">
                  <button
                    className="btnDark ghost wide"
                    type="button"
                    disabled={!selectedCredentialId}
                    title={!selectedCredentialId ? "Selecione uma credencial na esquerda" : "Sincronizar usinas"}
                    onClick={() => {
                      const row = providerCredentials.find((r) => r.id === selectedCredentialId);
                      if (row) syncCredential(row);
                    }}
                  >
                    ⟳ Sincronizar usinas
                  </button>
                  <div className="muted small" style={{ marginTop: 8 }}>
                    Selecione uma credencial do lado esquerdo e sincronize.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
