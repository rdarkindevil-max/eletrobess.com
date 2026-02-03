import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import "./login.css";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup
  const [password2, setPassword2] = useState("");

  const [captchaToken, setCaptchaToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const siteKey = "d8765758-502c-4982-b47e-b6dc369270e4";

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    if (!captchaToken) return false;
    if (mode === "signup" && password !== password2) return false;
    return true;
  }, [email, password, captchaToken, mode, password2]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });

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
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });
        if (error) throw error;

        setMsg({ type: "success", text: "✅ Logado com sucesso!" });
        // se quiser: window.location.href = "/gate";
        console.log("session", data?.session);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { captchaToken },
        });
        if (error) throw error;

        setMsg({
          type: "success",
          text: "✅ Conta criada! Verifique seu e-mail se o Supabase pedir confirmação.",
        });
        console.log("signup", data);
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: err?.message || "Falha no processo" });
      // se falhar, força resolver captcha de novo
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <header className="auth-header">
          <div className="brand">
            <img className="brand-logo" src="/logo.svg" alt="Eletrobess" />
            <div className="brand-text">
              <div className="brand-name">Eletrobess</div>
              <div className="brand-sub">Solar Dashboard</div>
            </div>
          </div>
        </header>

        <div className="auth-body">
          <h1 className="auth-title">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
          <p className="auth-desc">
            {mode === "login"
              ? "Acesse sua conta para entrar no painel."
              : "Crie uma conta para acessar o painel."}
          </p>

          {msg.text ? (
            <div className={`alert ${msg.type === "error" ? "alert-error" : "alert-success"}`}>
              {msg.text}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="form">
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seuemail@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label>Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>

            {mode === "signup" && (
              <div className="field">
                <label>Confirmar senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            <div className="captcha-wrap">
              <HCaptcha
                sitekey={siteKey}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={!canSubmit || loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setMsg({ type: "", text: "" });
                setCaptchaToken(null);
                setMode(mode === "login" ? "signup" : "login");
              }}
              disabled={loading}
            >
              {mode === "login" ? "Criar conta" : "Voltar para login"}
            </button>

            <div className="footer">© {new Date().getFullYear()} Eletrobess</div>
          </form>
        </div>
      </div>
    </div>
  );
}
