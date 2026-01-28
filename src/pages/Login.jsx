import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>

      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button
        onClick={() => {
          login(email);
          nav("/");
        }}
      >
        Entrar
      </button>

      <p>
        email com "cliente" = cliente  
        qualquer outro = funcionário
      </p>
    </div>
  );
}
