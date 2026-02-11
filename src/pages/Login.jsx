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

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Turnstile
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const isProd = import.meta.env.PROD;

  // se quiser ver no localhost também, troca pra: true
  const shouldShowCaptcha = true; // ou: isProd
console.log("=== TURNSTILE DEBUG ===");
console.log("SITE KEY:", siteKey);
console.log("IS PROD:", isProd);
console.log("SHOULD SHOW CAPTCHA:", shouldShowCaptcha);
console.log("=======================");

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [captchaKey, setCaptchaKey] = useState(0); // pra forçar reset do widget

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (mode === "signup" && password !== password2) return false;
    if (shouldShowCaptcha && !captchaToken) return false;
    return true;
  }, [email, password, mode, password2, shouldShowCaptcha, captchaToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (mode === "signup" && password !== password2) {
      setMsg({ type: "error", text: "As senhas não conferem." });
      return;
    }

    if (shouldShowCaptcha && !siteKey) {
      setMsg({
        type: "error",
        text: "Faltou VITE_TURNSTILE_SITE_KEY no .env / Vercel.",
      });
      return;
    }

    if (shouldShowCaptcha && !captchaToken) {
      setMsg({ type: "error", text: "Confirma o CAPTCHA antes de continuar." });
      return;
    }

    setLoading(true);

    try {
      // debug rápido (depois remove)
      // console.log("captchaToken len:", captchaToken?.length);

      const payloadBase = {
        email,
        password,
        ...(shouldShowCaptcha ? { options: { captchaToken } } : {}),
      };

      const { data, error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword(payloadBase)
          : await supabase.auth.signUp({
              ...payloadBase,
              // se quiser, pode setar redirectTo aqui
              // options: { ...payloadBase.options, emailRedirectTo: `${window.location.origin}/login` }
            });

      if (error) throw error;

      const session =
        data?.session ?? (await supabase.auth.getSession()).data?.session;

      if (!session) {
        throw new Error(
          "Login ok, mas sessão não apareceu (confere Supabase Auth / e-mail confirmation)."
        );
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

      // se falhar, reseta captcha pra obrigar resolver de novo
      if (shouldShowCaptcha) {
        setCaptchaToken("");
        setCaptchaError("");
        setCaptchaKey((k) => k + 1);
      }
    } finally {
      setLoading(false);
    }
  }

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
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>

            <div className="field">
              <label>Senha</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
            </div>

            {mode === "signup" && (
              <div className="field">
                <label>Confirmar senha</label>
                <input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  type="password"
                  required
                />
              </div>
            )}

            {/* CAPTCHA */}
            {shouldShowCaptcha && (
              <div className="field" style={{ marginTop: 10 }}>
                {!siteKey ? (
                  <div className="alert alert-error">
                    Faltou configurar <b>VITE_TURNSTILE_SITE_KEY</b>.
                  </div>
                ) : (
                  <>
                    <Turnstile
                      key={captchaKey}
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

            <button className="btn-primary" type="submit" disabled={!canSubmit || loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              disabled={loading}
              onClick={() => {
                setMsg({ type: "", text: "" });
                setCaptchaToken("");
                setCaptchaError("");
                setCaptchaKey((k) => k + 1);
                setMode(mode === "login" ? "signup" : "login");
              }}
            >
              {mode === "login" ? "Criar conta" : "Voltar para login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
