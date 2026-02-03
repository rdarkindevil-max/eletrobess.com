import React from "react";
import { Link } from "react-router-dom";

export default function NoAccess() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Sem acesso</h2>
      <p>Seu usuário não tem permissão para entrar nessa área.</p>
      <Link to="/login">Voltar pro login</Link>
    </div>
  );
}
