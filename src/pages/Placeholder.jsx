import React from "react";

export default function Placeholder({ title, desc }) {
  return (
    <div style={{ color: "#eaf2ff" }}>
      <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900 }}>{title}</h1>
      <p style={{ marginTop: 6, opacity: .75 }}>{desc}</p>
    </div>
  );
}
