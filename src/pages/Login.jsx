import React from "react";
import "./login.css";

export default function Login() {
  const isMaintenance = true; // 🔥 controle aqui (true = manutenção ativa)

  if (isMaintenance) {
    return (
      <div className="auth-bg">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <header className="auth-header">
            <div className="brand" style={{ justifyContent: "center" }}>
              <img className="brand-logo" src="/logo.png" alt="Eletrobess" />
              <div className="brand-text">
                <div className="brand-name">Eletrobess</div>
                <div className="brand-sub">Solar Dashboard</div>
              </div>
            </div>
          </header>

          <div className="auth-body">
            <h1 className="auth-title">🚧 Site em manutenção</h1>

            <p
              style={{
                marginTop: 12,
                fontSize: 14,
                color: "#ffffff",
                opacity: 0.9,
              }}
            >
              Estamos realizando melhorias no sistema.<br />
              Em breve tudo estará disponível novamente.
            </p>

            <div
              style={{
                marginTop: 20,
                fontSize: 13,
                color: "#ffffff",
                opacity: 0.7,
              }}
            >
              Agradecemos a sua paciência 🙏
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔓 SE DESATIVAR MANUTENÇÃO, AQUI VOCÊ COLOCA SEU LOGIN ORIGINAL
  return (
    <div className="auth-bg">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <h1 style={{ color: "white" }}>Login desativado temporariamente</h1>
      </div>
    </div>
  );
}
