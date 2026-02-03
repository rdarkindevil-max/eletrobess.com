import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles.css";

const EMPTY = {
  name: "",
  provider: "",
  base_url: "",
  api_key: "",
  api_secret: "",
  username: "",
  password: "",
  is_active: true,
  notes: "",
};

export default function Integrations() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    const { data } = await supabase.from("integrations").select("*").order("created_at", { ascending: false });
    setList(data || []);
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function startEdit(x) {
    setEditing(x);
    setForm({ ...EMPTY, ...x });
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name || !form.provider) return alert("Preenche name e provider");

    if (editing?.id) {
      const { error } = await supabase.from("integrations").update(form).eq("id", editing.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from("integrations").insert(form);
      if (error) return alert(error.message);
    }

    setOpen(false);
    await load();
  }

  async function remove(id) {
    if (!confirm("Excluir integração?")) return;
    const { error } = await supabase.from("integrations").delete().eq("id", id);
    if (error) return alert(error.message);
    await load();
  }

  async function toggle(id, is_active) {
    const { error } = await supabase.from("integrations").update({ is_active: !is_active }).eq("id", id);
    if (error) return alert(error.message);
    await load();
  }

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="title">APIs / Integrações</h1>
          <p className="subtitle">Cadastre credenciais e deixe ativo/inativo.</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={startNew}>+ Nova Integração</button>
        </div>
      </div>

      {open && (
        <form className="panel" onSubmit={save}>
          <div className="grid2">
            <Field label="Nome" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
            <Field label="Provider (ex: solarman)" value={form.provider} onChange={(v) => setForm((p) => ({ ...p, provider: v }))} />

            <Field label="Base URL" value={form.base_url} onChange={(v) => setForm((p) => ({ ...p, base_url: v }))} />
            <SelectBool label="Ativo?" value={form.is_active} onChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />

            <Field label="API Key" value={form.api_key} onChange={(v) => setForm((p) => ({ ...p, api_key: v }))} />
            <Field label="API Secret" value={form.api_secret} onChange={(v) => setForm((p) => ({ ...p, api_secret: v }))} />

            <Field label="Username" value={form.username} onChange={(v) => setForm((p) => ({ ...p, username: v }))} />
            <Field label="Password" value={form.password} onChange={(v) => setForm((p) => ({ ...p, password: v }))} />

            <div className="full">
              <label className="label">Observações</label>
              <input className="input" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <div className="formFooter">
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn primary" type="submit">Salvar</button>
          </div>
        </form>
      )}

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Integração</th>
              <th>Provider</th>
              <th>Ativo</th>
              <th style={{ width: 240 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} className="empty">Nenhuma integração.</td></tr>
            ) : (
              list.map((x) => (
                <tr key={x.id}>
                  <td>
                    <div className="tName">{x.name}</div>
                    <div className="tSub">{x.base_url || ""}</div>
                  </td>
                  <td>{x.provider}</td>
                  <td>
                    <span className={"pill " + (x.is_active ? "fechado" : "cancelado")}>
                      {x.is_active ? "ATIVO" : "INATIVO"}
                    </span>
                  </td>
                  <td>
                    <div className="row">
                      <button className="btn ghost" onClick={() => toggle(x.id, x.is_active)}>
                        {x.is_active ? "Desativar" : "Ativar"}
                      </button>
                      <button className="btn ghost" onClick={() => startEdit(x)}>Editar</button>
                      <button className="btn danger" onClick={() => remove(x.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="muted small" style={{ marginTop: 10 }}>
        ⚠️ Conexão automática de dados de plataforma exige backend (Edge Function / servidor).
        Aqui você já registra as credenciais “de verdade”. A automação é o próximo passo.
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectBool({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value ? "yes" : "no"} onChange={(e) => onChange(e.target.value === "yes")}>
        <option value="yes">Sim</option>
        <option value="no">Não</option>
      </select>
    </div>
  );
}
