"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import type { ConnectorType } from "@/lib/types";

const TYPES: { value: ConnectorType; label: string; help: string }[] = [
  { value: "salesforce", label: "Salesforce", help: "Username-password, connected app, or demo org." },
  { value: "oracle", label: "Oracle Database", help: "Host, service name, schema. Demo CRM schema included." },
  { value: "postgres", label: "PostgreSQL", help: "Host, database, optional schema." },
  { value: "mysql", label: "MySQL", help: "Host, database, user." },
  { value: "sqlserver", label: "SQL Server", help: "Coming online; save the connection now." },
  { value: "file", label: "CSV / Excel", help: "Use the File import wizard; this connector is a placeholder." },
];

export default function NewConnectorPage() {
  const router = useRouter();
  const [type, setType] = useState<ConnectorType>("salesforce");
  const [name, setName] = useState("Salesforce sandbox");
  const [environment, setEnvironment] = useState<"production" | "sandbox" | "demo">("sandbox");
  const [config, setConfig] = useState<Record<string, string>>({
    loginUrl: "https://test.salesforce.com",
    apiVersion: "61.0",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setField(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api<{ connector: { id: string } }>("/api/connectors", {
        method: "POST",
        body: JSON.stringify({ name, type, environment, config }),
      });
      router.push(`/connectors/${created.connector.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save connector.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl">Add connector</h1>
        <p className="text-ink-soft mt-2">Credentials stay on this machine in the local Flowline database. Passwords are masked in the UI.</p>
      </div>
      {error && <p className="text-err text-sm">{error}</p>}
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-ink-soft">Name</span>
        <input className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TYPES.map((item) => (
          <button
            type="button"
            key={item.value}
            onClick={() => {
              setType(item.value);
              if (item.value === "salesforce") setName("Salesforce sandbox");
              if (item.value === "oracle") {
                setName("Oracle CRM");
                setEnvironment("production");
              }
            }}
            className={`text-left border rounded-xl p-4 ${type === item.value ? "border-forest bg-chip" : "border-line bg-card"}`}
          >
            <div className="font-medium">{item.label}</div>
            <div className="text-sm text-ink-soft mt-1">{item.help}</div>
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-ink-soft">Environment</span>
        <select className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-card" value={environment} onChange={(e) => setEnvironment(e.target.value as typeof environment)}>
          <option value="demo">Demo (no live credentials)</option>
          <option value="sandbox">Sandbox / test</option>
          <option value="production">Production</option>
        </select>
      </label>

      {type === "salesforce" && environment !== "demo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card border border-line rounded-xl p-4">
          <Field label="Login URL" value={config.loginUrl || ""} onChange={(v) => setField("loginUrl", v)} placeholder="https://login.salesforce.com" />
          <Field label="API version" value={config.apiVersion || "61.0"} onChange={(v) => setField("apiVersion", v)} />
          <Field label="Username" value={config.username || ""} onChange={(v) => setField("username", v)} />
          <Field label="Password" value={config.password || ""} onChange={(v) => setField("password", v)} type="password" />
          <Field label="Security token" value={config.securityToken || ""} onChange={(v) => setField("securityToken", v)} type="password" />
          <Field label="Connected app consumer key" value={config.clientId || ""} onChange={(v) => setField("clientId", v)} />
          <Field label="Consumer secret" value={config.clientSecret || ""} onChange={(v) => setField("clientSecret", v)} type="password" />
          <Field label="Instance URL (optional)" value={config.instanceUrl || ""} onChange={(v) => setField("instanceUrl", v)} />
          <Field label="Access token (optional)" value={config.accessToken || ""} onChange={(v) => setField("accessToken", v)} type="password" />
        </div>
      )}

      {(type === "oracle" || type === "postgres" || type === "mysql" || type === "sqlserver") && environment !== "demo" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card border border-line rounded-xl p-4">
          <Field label="Host" value={config.host || ""} onChange={(v) => setField("host", v)} />
          <Field label="Port" value={config.port || (type === "oracle" ? "1521" : type === "mysql" ? "3306" : "5432")} onChange={(v) => setField("port", v)} />
          <Field label={type === "oracle" ? "Service name" : "Database"} value={config.database || config.serviceName || ""} onChange={(v) => setField(type === "oracle" ? "serviceName" : "database", v)} />
          <Field label="Username" value={config.username || ""} onChange={(v) => setField("username", v)} />
          <Field label="Password" value={config.password || ""} onChange={(v) => setField("password", v)} type="password" />
          <Field label="Schema" value={config.schema || ""} onChange={(v) => setField("schema", v)} />
        </div>
      )}

      {environment === "demo" && (
        <div className="bg-chip border border-line rounded-xl p-4 text-sm text-ink-soft">
          Demo connectors use built-in Oracle CRM tables and Salesforce metadata. You can map and load immediately.
        </div>
      )}

      <button disabled={saving} className="px-4 py-2 rounded-md bg-forest text-white text-sm disabled:opacity-60">
        {saving ? "Saving…" : "Save connector"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink-soft">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1 w-full border border-line rounded-md px-3 py-2 bg-paper"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
