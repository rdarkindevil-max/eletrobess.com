import React from "react";
import { Link } from "react-router-dom";

export default function NoAccess() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Sem acesso</h2>
      <p>Você não tem permissão para acessar esta página.</p>
      <Link to="/login">Voltar para login</Link>
    </div>
  );
}
