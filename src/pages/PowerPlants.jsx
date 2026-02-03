import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "../styles.css";

const EMPTY = {
  name: "",
  status: "active",
  platform: "",
  external_id: "",
  city: "",
  state: "",
  notes: "",
};

export default function Plants() {
  const [list, setList] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, client_id: "" });

  async function load() {
    const [{ data: plants }, { data: cl }] = await Promise.all([
      supabase.from("power_plants").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("id,name").order("name"),
    ]);
    setList(plants || []);
    setClients(cl || []);
  }

  useEffect(() => { load(); }, []);

  function startNew() {
    setEditing(null);
    setForm({ ...EMPTY, client_id: "" });
    setOpen(true);
  }

  function startEdit(p) {
    setEditing(p);
    setForm({ ...EMPTY, ...p, client_id: p.client_id || "" });
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    const payload = { ...form, client_id: form.client_id || null };

    if (editing?.id) {
      const { error } = await supabase.from("power_plants").update(payload).eq("id", editing.id);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from("power_plants").insert(payload);
      if (error) return alert(error.message);
    }
    setOpen(false);
    await load();
  }

  async function remove(id) {
    if (!confirm("Excluir usina?")) return;
    const { error } = await supabase.from("power_plants").delete().eq("id", id);
    if (error) return alert(error.message);
    await load();
  }

  const clientName = (id) => clients.find((c) => c.id === id)?.name || "-";

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1 className="title">Usinas</h1>
          <p className="subtitle">Cadastro de usinas + vínculo com cliente.</p>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={startNew}>+ Nova Usina</button>
        </div>
      </div>

      {open && (
        <form className="panel" onSubmit={save}>
          <div className="grid2">
            <Field label="Nome da usina" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
            <Select label="Status" value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))}
              options={[
                { value: "active", label: "Ativa" },
                { value: "inactive", label: "Inativa" },
                { value: "maintenance", label: "Manutenção" },
              ]}
            />

            <div>
              <label className="label">Cliente</label>
              <select className="input" value={form.client_id} onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}>
                <option value="">Sem vínculo</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <Field label="Plataforma (ex: Solarman)" value={form.platform} onChange={(v) => setForm((p) => ({ ...p, platform: v }))} />
            <Field label="ID Externo" value={form.external_id} onChange={(v) => setForm((p) => ({ ...p, external_id: v }))} />

            <Field label="Cidade" value={form.city} onChange={(v) => setForm((p) => ({ ...p, city: v }))} />
            <Field label="Estado" value={form.state} onChange={(v) => setForm((p) => ({ ...p, state: v }))} />

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
              <th>Usina</th>
              <th>Cliente</th>
              <th>Plataforma</th>
              <th>Status</th>
              <th style={{ width: 170 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} className="empty">Nenhuma usina.</td></tr>
            ) : (
              list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="tName">{p.name}</div>
                    <div className="tSub">{p.city || "-"}{p.state ? `/${p.state}` : ""}</div>
                  </td>
                  <td>{clientName(p.client_id)}</td>
                  <td>{p.platform || "-"}</td>
                  <td>{p.status}</td>
                  <td>
                    <div className="row">
                      <button className="btn ghost" onClick={() => startEdit(p)}>Editar</button>
                      <button className="btn danger" onClick={() => remove(p.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
