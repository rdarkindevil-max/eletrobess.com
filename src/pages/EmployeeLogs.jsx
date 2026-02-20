import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function fmtDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("pt-BR");
  } catch {
    return String(v);
  }
}

const colors = {
  title: "#0f172a",
  text: "#0f172a",
  sub: "#475569",
  border: "rgba(15, 23, 42, .10)",
  bg: "#ffffff",
};

function Badge({ children, tone = "default" }) {
  const map = {
    default: { bg: "rgba(2,132,199,.10)", fg: "#075985", bd: "rgba(2,132,199,.25)" },
    ok: { bg: "rgba(16,185,129,.12)", fg: "#047857", bd: "rgba(16,185,129,.25)" },
    warn: { bg: "rgba(245,158,11,.12)", fg: "#92400e", bd: "rgba(245,158,11,.25)" },
    bad: { bg: "rgba(239,68,68,.12)", fg: "#991b1b", bd: "rgba(239,68,68,.25)" },
    gray: { bg: "rgba(100,116,139,.12)", fg: "#334155", bd: "rgba(100,116,139,.25)" },
  };
  const t = map[tone] || map.default;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function addDaysISO(dateStr, days) {
  // dateStr: "YYYY-MM-DD"
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString(); // UTC ISO
}

export default function EmployeeLogs() {
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [rows, setRows] = useState([]);

  const [q, setQ] = useState("");
  const [type, setType] = useState("all"); // all | LOGIN | LOGOUT
  const [limit, setLimit] = useState(50);

  // ✅ Calendário (filtro server-side)
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState("");     // YYYY-MM-DD

  const loadLogs = async () => {
    setErrMsg("");
    setLoading(true);

    try {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (type !== "all") query = query.eq("type", type);

      // ✅ filtro por data
      // fromDate = >= fromDate 00:00
      if (fromDate) {
        query = query.gte("created_at", `${fromDate}T00:00:00.000Z`);
      }

      // toDate = < (toDate + 1 dia) 00:00  (pega o dia inteiro)
      if (toDate) {
        const nextDayISO = addDaysISO(toDate, 1);
        query = query.lt("created_at", nextDayISO);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRows(data || []);
    } catch (e) {
      setErrMsg(e?.message || "Erro ao carregar logs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, limit, fromDate, toDate]);

  // busca local por texto (email, ip etc)
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return (rows || []).filter((r) => {
      const blob = [r?.email, r?.type, r?.ip, r?.user_id, r?.user_agent]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(qq);
    });
  }, [rows, q]);

  return (
    <div className="p-6">
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: colors.title }}>
          Logs de Acesso
        </h1>
        <span style={{ color: colors.sub, fontWeight: 700 }}>
          Entradas (LOGIN) e Saídas (LOGOUT)
        </span>
      </div>

      {errMsg ? (
        <div className="warn" style={{ marginTop: 12 }}>
          Erro: {errMsg}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr 160px 140px 170px 170px 140px",
          gap: 10,
          maxWidth: 1250,
        }}
      >
        <input
          className="input"
          placeholder="Buscar por email, user_id, ip..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">Todos</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
        </select>

        <select className="input" value={String(limit)} onChange={(e) => setLimit(Number(e.target.value) || 50)}>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>

        <input
          className="input"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title="Data inicial"
        />

        <input
          className="input"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          title="Data final"
        />

        <button className="btn ghost" type="button" onClick={loadLogs}>
          Atualizar
        </button>
      </div>

      <div style={{ marginTop: 10, color: colors.sub, fontSize: 12, fontWeight: 700 }}>
        Dica: pra ver o dia inteiro, selecione Data Inicial e Data Final iguais.
      </div>

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ color: colors.text, fontWeight: 800 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: colors.sub, fontWeight: 800 }}>Nenhum log encontrado.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, maxWidth: 1100 }}>
            {filtered.map((it) => {
              const t = String(it.type || "").toUpperCase();
              const badgeTone = t === "LOGIN" ? "ok" : t === "LOGOUT" ? "bad" : "gray";

              return (
                <div
                  key={it.id}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: 12,
                    background: colors.bg,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: colors.text }}>
                      {it.email || it.user_id || "-"}
                    </div>

                    <div style={{ fontSize: 12, color: colors.sub, fontWeight: 800 }}>
                      <span style={{ marginRight: 8 }}>
                        <Badge tone={badgeTone}>{t || "—"}</Badge>
                      </span>
                      <span>• {fmtDate(it.created_at)}</span>
                      {it.ip ? <span> • IP: {it.ip}</span> : null}
                    </div>

                    {it.user_agent ? (
                      <div style={{ fontSize: 12, color: colors.sub, marginTop: 6, fontWeight: 700 }}>
                        UA: {it.user_agent}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, color: colors.sub, fontSize: 12, fontWeight: 700 }}>
        Tabela: <b style={{ color: colors.text }}>activity_logs</b> (type, created_at, email/user_id)
      </div>
    </div>
  );
}