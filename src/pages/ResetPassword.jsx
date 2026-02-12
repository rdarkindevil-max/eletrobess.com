import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./login.css";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // mesmas regras do teu supabase
  const MIN_PASSWORD_LEN = 8;

  function getPasswordIssues(pw) {
    const issues = [];
    if ((pw || "").length < MIN_PASSWORD_LEN)
      issues.push(`mínimo ${MIN_PASSWORD_LEN} caracteres`);
    if (!/[a-z]/.test(pw || "")) issues.push("1 letra minúscula");
    if (!/[A-Z]/.test(pw || "")) issues.push("1 letra maiúscula");
    if (!/[0-9]/.test(pw || "")) issues.push("1 número");
    if (!/[^A-Za-z0-9]/.test(pw || "")) issues.push("1 símbolo");
    return issues;
  }

  const issues = useMemo(() => getPasswordIssues(pw1), [pw1]);

  // detecta se a URL tem token de recovery
  const hasRecoveryParams = useMemo(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    return (
      hash.includes("type=recovery") ||
      hash.includes("access_token=") ||
      search.includes("type=recovery") ||
      search.includes("access_token=")
    );
  }, []);

  async function handleSetNewPassword(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!hasRecoveryParams) {
      setMsg({
        type: "error",
        text:
          "Link inválido ou expirado. Volte no login e peça um novo e-mail de recuperação.",
      });
      return;
    }

    if (!pw1 || !pw2) {
      setMsg({ type: "error", text: "Preencha a nova senha e a confirmação." });
      return;
    }

    if (pw1 !== pw2) {
      setMsg({ type: "error", text: "As senhas não conferem." });
      return;
    }

    if (issues.length > 0) {
      setMsg({
        type: "error",
        text: `Senha inválida: falta ${issues.join(", ")}.`,
      });
      return;
    }

    setLoading(true);
    try {
      // o Supabase já injeta a sessão via hash quando abre o link,
      // então updateUser funciona aqui.
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      setMsg({ type: "success", text: "✅ Senha alterada! Pode logar agora." });

      // limpa hash pra não reutilizar token
      window.history.replaceState(null, "", "/login");

      setTimeout(() => navigate("/login", { replace: true }), 800);
    } catch (err) {
      setMsg({
        type: "error",
        text:
          err?.message ||
          "Não foi possível atualizar a senha. Peça um novo link e tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  const Eye = ({ open }) => (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {open ? "🙈" : "👁️"}
    </span>
  );

  const Spinner = () => (
    <span
      aria-label="Carregando"
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.35)",
        borderTopColor: "rgba(255,255,255,0.95)",
        display: "inline-block",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <header className="auth-header">
          <div className="brand">
            <img className="brand-logo" src="/logo.png" alt="Eletrobess" />
            <div className="brand-text">
              <div className="brand-name">Eletrobess</div>
              <div className="brand-sub">Solar Dashboard</div>
            </div>
          </div>
        </header>

        <div className="auth-body">
          <h1 className="auth-title">Redefinir senha</h1>

          {msg.text && (
            <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`}>
              {msg.text}
            </div>
          )}

          {!hasRecoveryParams ? (
            <div style={{ color: "#fff", opacity: 0.95, lineHeight: 1.5 }}>
              <div style={{ marginBottom: 10, fontWeight: 700 }}>
                Link inválido/expirado.
              </div>
              <div style={{ marginBottom: 14 }}>
                Volte para o login e clique em <b>Esqueci minha senha</b> pra gerar um novo link.
              </div>

              <button
                className="btn-primary"
                type="button"
                onClick={() => navigate("/login", { replace: true })}
              >
                Voltar pro login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetNewPassword} className="form">
              <div className="field">
                <label>Nova senha</label>
                <div style={{ position: "relative" }}>
                  <input
                    value={pw1}
                    onChange={(e) => setPw1(e.target.value)}
                    type={show1 ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow1((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      fontSize: 16,
                      padding: 6,
                      color: "#ffffff",
                      opacity: 0.95,
                    }}
                  >
                    <Eye open={show1} />
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    lineHeight: 1.4,
                    color: "#fff",
                    opacity: 0.95,
                  }}
                >
                  <div><b>Requisitos:</b></div>
                  <div>• Mínimo {MIN_PASSWORD_LEN} caracteres</div>
                  <div>• 1 minúscula, 1 maiúscula, 1 número e 1 símbolo</div>

                  {pw1.length > 0 && issues.length > 0 && (
                    <div style={{ marginTop: 6, color: "#ffb3b3" }}>
                      <b>Falta:</b> {issues.join(", ")}.
                    </div>
                  )}
                </div>
              </div>

              <div className="field">
                <label>Confirmar nova senha</label>
                <div style={{ position: "relative" }}>
                  <input
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    type={show2 ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow2((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                      fontSize: 16,
                      padding: 6,
                      color: "#ffffff",
                      opacity: 0.95,
                    }}
                  >
                    <Eye open={show2} />
                  </button>
                </div>
              </div>

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? (
                  <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                    <Spinner /> Salvando...
                  </span>
                ) : (
                  "Salvar nova senha"
                )}
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={loading}
                onClick={() => navigate("/login", { replace: true })}
              >
                Voltar pro login
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
