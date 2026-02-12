import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import { supabase } from "../lib/supabaseClient";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Turnstile
  const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();
  const shouldShowCaptcha = true;

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  // Regras de senha (igual teu Supabase)
  const MIN_PASSWORD_LEN = 8;

  function getPasswordIssues(pw) {
    const issues = [];
    if ((pw || "").length < MIN_PASSWORD_LEN) issues.push(`mínimo ${MIN_PASSWORD_LEN} caracteres`);
    if (!/[a-z]/.test(pw || "")) issues.push("1 letra minúscula");
    if (!/[A-Z]/.test(pw || "")) issues.push("1 letra maiúscula");
    if (!/[0-9]/.test(pw || "")) issues.push("1 número");
    if (!/[^A-Za-z0-9]/.test(pw || "")) issues.push("1 símbolo");
    return issues;
  }

  const passwordIssues = useMemo(
    () => (mode === "signup" ? getPasswordIssues(password) : []),
    [mode, password]
  );

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;

    if (mode === "signup") {
      if (password !== password2) return false;
      if (passwordIssues.length > 0) return false;
    }

    if (shouldShowCaptcha && !captchaToken) return false;

    return true;
  }, [email, password, mode, password2, passwordIssues.length, shouldShowCaptcha, captchaToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (mode === "signup") {
      if (password !== password2) {
        setMsg({ type: "error", text: "As senhas não conferem." });
        return;
      }
      if (passwordIssues.length > 0) {
        setMsg({
          type: "error",
          text: `Senha inválida: falta ${passwordIssues.join(", ")}.`,
        });
        return;
      }
    }

    if (shouldShowCaptcha && !siteKey) {
      setMsg({ type: "error", text: "Faltou VITE_TURNSTILE_SITE_KEY (ENV)." });
      return;
    }

    if (shouldShowCaptcha && !captchaToken) {
      setMsg({ type: "error", text: "Confirma o CAPTCHA antes de continuar." });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email,
        password,
        options: shouldShowCaptcha ? { captchaToken } : undefined,
      };

      const { data, error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword(payload)
          : await supabase.auth.signUp(payload);

      if (error) throw error;

      const session =
        data?.session ?? (await supabase.auth.getSession()).data?.session;

      // Se signup exige confirmação de e-mail, pode vir sem sessão
      if (!session) {
        setMsg({
          type: "success",
          text:
            mode === "signup"
              ? "✅ Conta criada! Verifique seu e-mail para confirmar o cadastro."
              : "✅ Logado com sucesso!",
        });
        return;
      }

      setMsg({
        type: "success",
        text: mode === "login" ? "✅ Logado com sucesso!" : "✅ Conta criada!",
      });

      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.message || "Falha no processo de autenticação.",
      });

      if (shouldShowCaptcha) setCaptchaToken("");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setMsg({ type: "", text: "" });

    if (!email) {
      setMsg({ type: "error", text: "Digite seu e-mail acima para recuperar a senha." });
      return;
    }

    setLoading(true);
    try {
      // Ajusta aqui pra tua rota/tela de reset (você vai criar)
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      setMsg({
        type: "success",
        text: "✅ Te enviei um e-mail com o link para redefinir a senha.",
      });
    } catch (err) {
      setMsg({
        type: "error",
        text: err?.message || "Não foi possível enviar o e-mail de recuperação.",
      });
    } finally {
      setLoading(false);
    }
  }

  const EyeIcon = ({ open }) => (
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
          <h1 className="auth-title">{mode === "login" ? "Entrar" : "Criar conta"}</h1>

          {msg.text && (
            <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="field">
              <label>E-mail</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label>Senha</label>

              {/* wrapper simples sem mexer no teu CSS: inline */}
              <div style={{ position: "relative" }}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  style={{ paddingRight: 46 }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
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
                    opacity: 0.9,
                  }}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              {/* Regras no signup */}
              {mode === "signup" && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9, lineHeight: 1.4 }}>
                  <div><b>Requisitos da senha:</b></div>
                  <div>• Mínimo {MIN_PASSWORD_LEN} caracteres</div>
                  <div>• 1 minúscula, 1 maiúscula, 1 número e 1 símbolo</div>

                  {password.length > 0 && passwordIssues.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <b>Falta:</b> {passwordIssues.join(", ")}.
                    </div>
                  )}
                </div>
              )}
            </div>

            {mode === "signup" && (
              <div className="field">
                <label>Confirmar senha</label>

                <div style={{ position: "relative" }}>
                  <input
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    type={showPassword2 ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: 46 }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword2((v) => !v)}
                    aria-label={showPassword2 ? "Ocultar senha" : "Mostrar senha"}
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
                      opacity: 0.9,
                    }}
                  >
                    <EyeIcon open={showPassword2} />
                  </button>
                </div>
              </div>
            )}

            {shouldShowCaptcha && (
              <div className="field" style={{ marginTop: 10 }}>
                {!siteKey ? (
                  <div className="alert alert-error">
                    Faltou configurar <b>VITE_TURNSTILE_SITE_KEY</b>.
                  </div>
                ) : (
                  <>
                    <Turnstile
                      key={siteKey}
                      siteKey={siteKey}
                      options={{ theme: "auto" }}
                      onSuccess={(token) => {
                        setCaptchaError("");
                        setCaptchaToken(token);
                      }}
                      onExpire={() => setCaptchaToken("")}
                      onError={() => {
                        setCaptchaToken("");
                        setCaptchaError("Erro ao carregar o CAPTCHA.");
                      }}
                    />
                    {captchaError && (
                      <div className="alert alert-error" style={{ marginTop: 8 }}>
                        {captchaError}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Esqueci minha senha (só no login) */}
            {mode === "login" && (
              <button
                type="button"
                disabled={loading}
                onClick={handleForgotPassword}
                style={{
                  marginTop: 10,
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  opacity: 0.9,
                  fontSize: 13,
                }}
              >
                Esqueci minha senha
              </button>
            )}

            <button className="btn-primary" type="submit" disabled={!canSubmit || loading}>
              {loading ? (
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                  <Spinner /> Aguarde...
                </span>
              ) : mode === "login" ? (
                "Entrar"
              ) : (
                "Criar conta"
              )}
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={loading}
              onClick={() => {
                setMsg({ type: "", text: "" });
                setCaptchaToken("");
                setPassword("");
                setPassword2("");
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "Criar conta" : "Voltar para login"}
            </button>
          </form>
        </div>
      </div>

      {/* animação do spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
