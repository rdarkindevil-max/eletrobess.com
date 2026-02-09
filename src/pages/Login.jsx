import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Turnstile } from "@marsidev/react-turnstile";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const turnstileRef = useRef(null);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [captchaToken, setCaptchaToken] = useState(null);
  const [widgetReady, setWidgetReady] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (!captchaToken) return false;
    if (mode === "signup" && password !== password2) return false;
    return true;
  }, [email, password, captchaToken, mode, password2]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!siteKey) {
      setMsg({ type: "error", text: "Turnstile sem siteKey (.env / Vercel)." });
      return;
    }

    if (!widgetReady) {
      setMsg({ type: "error", text: "Captcha ainda carregando..." });
      return;
    }

    if (!captchaToken) {
      setMsg({ type: "error", text: "Resolva o captcha primeiro." });
      return;
    }

    if (mode === "signup" && password !== password2) {
      setMsg({ type: "error", text: "As senhas não conferem." });
      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword({
              email,
              password,
              options: { captchaToken },
            })
          : await supabase.auth.signUp({
              email,
              password,
              options: { captchaToken },
            });

      if (error) throw error;

      // garante sessão antes de ir pro painel
      const session = data?.session ?? (await supabase.auth.getSession()).data?.session;
      if (!session) throw new Error("Login ok, mas sessão não apareceu (check Supabase auth).");

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

      setCaptchaToken(null);
      try {
        turnstileRef.current?.reset?.();
      } catch {}
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
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </div>

            {mode === "signup" && (
              <div className="field">
                <label>Confirmar senha</label>
                <input value={password2} onChange={(e) => setPassword2(e.target.value)} type="password" required />
              </div>
            )}

            {!siteKey ? (
              <div className="alert alert-error">
                Falta <b>VITE_TURNSTILE_SITE_KEY</b> no .env.local / Vercel.
              </div>
            ) : (
              <div className="captcha-wrap">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={siteKey}
                  onLoadScript={() => setWidgetReady(true)}
                  onWidgetLoad={() => setWidgetReady(true)}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                  options={{ theme: "auto" }}
                />
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
                setCaptchaToken(null);
                setWidgetReady(false);
                try {
                  turnstileRef.current?.reset?.();
                } catch {}
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
