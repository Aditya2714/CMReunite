import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import SendMail from "./SendMail";
const input = "form-control";
const tabs = { dashboard: "Dashboard", admins: "Department Admins", departments: "Departments", analytics: "Analytics", announcements: "Announcements", audit: "Audit Log", unassigned: "Unassigned Records" };
const statusLabels = { all: "All alumni", approved: "Approved", pending: "Pending", rejected: "Rejected" };
const number = (value) => Number(value) || 0;
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

function HorizontalBars({ title, rows, valueKey, color = "bg-blue-600" }) {
  const maximum = Math.max(1, ...rows.map((entry) => number(entry[valueKey])));
  return <article className="rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="text-lg font-bold text-slate-900">{title}</h3>
    <div className="mt-5 space-y-4">{rows.map((entry) => {
      const value = number(entry[valueKey]);
      return <div key={entry.code} className="grid grid-cols-[5rem_1fr_3rem] items-center gap-3">
        <span className="truncate text-sm font-bold text-slate-700" title={entry.code}>{entry.code}</span>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${entry.code}: ${value}`}><div className={`h-full rounded-full ${color}`} style={{ width: `${value ? Math.max(6, value / maximum * 100) : 0}%` }} /></div>
        <strong className="text-right text-sm">{value}</strong>
      </div>;
    })}{!rows.length && <p className="text-sm text-slate-500">No departments match these filters.</p>}</div>
  </article>;
}

function ApprovalBars({ rows }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="text-lg font-bold text-slate-900">Approval status by department</h3>
    <div className="mt-5 space-y-4">{rows.map((entry) => {
      const approved = number(entry.approved), pending = number(entry.pending), rejected = number(entry.rejected);
      const total = Math.max(1, approved + pending + rejected);
      return <div key={entry.code}>
        <div className="mb-2 flex items-center justify-between text-sm"><strong>{entry.code}</strong><span>{approved + pending + rejected} profiles</span></div>
        <div className="flex h-4 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${entry.code}: ${approved} approved, ${pending} pending, ${rejected} rejected`}>
          <div className="bg-emerald-500" style={{ width: `${approved / total * 100}%` }} /><div className="bg-amber-400" style={{ width: `${pending / total * 100}%` }} /><div className="bg-rose-500" style={{ width: `${rejected / total * 100}%` }} />
        </div>
      </div>;
    })}</div>
    <div className="mt-5 flex flex-wrap gap-4 text-xs font-bold"><span className="text-emerald-700">● Approved</span><span className="text-amber-700">● Pending</span><span className="text-rose-700">● Rejected</span></div>
  </article>;
}

function AdminCoverage({ rows }) {
  const eligible = rows.filter((entry) => entry.code !== "UNASSIGNED");
  const covered = eligible.filter((entry) => entry.admin).length;
  const total = eligible.length;
  const percentage = total ? Math.round(covered / total * 100) : 0;
  return <article className="rounded-xl border border-slate-200 bg-white p-5">
    <h3 className="text-lg font-bold text-slate-900">Department admin coverage</h3>
    <div className="mt-5 flex items-center gap-6">
      <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full" role="img" aria-label={`${covered} of ${total} departments have an active admin`} style={{ background: `conic-gradient(#2563eb ${percentage}%, #e2e8f0 0)` }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-xl font-black">{percentage}%</div></div>
      <div><p className="text-3xl font-black">{covered}/{total}</p><p className="text-sm text-slate-600">departments covered</p><p className="mt-2 text-sm font-bold text-amber-700">{Math.max(0, total - covered)} vacancies</p></div>
    </div>
  </article>;
}
export default function SuperAdmin() {
  const [params, setParams] = useSearchParams();
  const tab = tabs[params.get("tab")] ? params.get("tab") : "dashboard";
  const [data, setData] = useState(null), [departments, setDepartments] = useState([]), [admins, setAdmins] = useState([]), [audit, setAudit] = useState({ entries: [], pagination: {} });
  const [unassigned, setUnassigned] = useState({ records: [], pagination: {} });
  const [type, setType] = useState("alumni"), [page, setPage] = useState(1), [auditPage, setAuditPage] = useState(1);
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [analyticsDepartment, setAnalyticsDepartment] = useState("all"), [analyticsStatus, setAnalyticsStatus] = useState("all"), [analyticsView, setAnalyticsView] = useState("all");
  const [departmentForm, setDepartmentForm] = useState({ code: "", name: "" });
  const [adminForm, setAdminForm] = useState({ name: "", email: "", department: "" });
  const [replacingAdmin, setReplacingAdmin] = useState(""), [replacementForm, setReplacementForm] = useState({ name: "", email: "" });
  const [targets, setTargets] = useState({}), [renames, setRenames] = useState({});
  const load = useCallback(async () => {
    const responses = await Promise.all([api.get("/super-admin/overview"), api.get("/super-admin/departments"), api.get("/super-admin/admins"), api.get("/super-admin/audit", { params: { page: auditPage } }), api.get("/super-admin/unassigned", { params: { type, page } })]);
    setData(responses[0].data.data); setDepartments(responses[1].data.data.departments); setAdmins(responses[2].data.data.admins); setAudit(responses[3].data.data); setUnassigned(responses[4].data.data);
  }, [type, page, auditPage]);
  useEffect(() => { let active = true; setLoading(true); load().catch((failure) => { if (active) setError(failure.response?.data?.message || "Unable to load administration workspace"); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [load]);
  const action = async (operation, success) => {
    if (busy) return;
    setBusy(true); setError(""); setMessage(""); setSecret("");
    try { const response = await operation(); if (response?.data?.data?.temporaryPassword) setSecret(response.data.data.temporaryPassword); await load(); setMessage(success); return true; }
    catch (failure) { setError(failure.response?.data?.message || "Unable to complete the action"); return false; }
    finally { setBusy(false); }
  };
  const departmentSelect = (value, onChange, label) => <select aria-label={label} value={value || ""} onChange={(event) => onChange(event.target.value)} className={input} required><option value="">Select department</option>{departments.filter((entry) => entry.isActive).map((entry) => <option key={entry._id} value={entry._id}>{entry.code} — {entry.name}</option>)}</select>;
  const pageControls = (pagination, current, setCurrent, label) => <nav aria-label={label} className="mt-4 flex gap-4"><button disabled={current <= 1 || busy} onClick={() => setCurrent(current - 1)}>Previous</button><span>Page {current} of {pagination.pages || 1}</span><button disabled={current >= (pagination.pages || 1) || busy} onClick={() => setCurrent(current + 1)}>Next</button></nav>;
  const analyticsRows = (data?.departments || []).filter((entry) => analyticsDepartment === "all" || entry.code === analyticsDepartment);
  const analyticsEventRows = analyticsDepartment === "all" ? [...analyticsRows, { code: "PLATFORM", events: data?.totals.platformEvents }] : analyticsRows;
  const alumniMetric = analyticsStatus === "all" ? "alumni" : analyticsStatus;
  const analyticsTotals = analyticsRows.reduce((totals, entry) => ({ alumni: totals.alumni + number(entry[alumniMetric]), admins: totals.admins + (entry.admin ? 1 : 0), approved: totals.approved + number(entry.approved), pending: totals.pending + number(entry.pending), rejected: totals.rejected + number(entry.rejected) }), { alumni: 0, admins: 0, approved: 0, pending: 0, rejected: 0 });
  const filteredEventTotal = analyticsEventRows.reduce((total, entry) => total + number(entry.events), 0);
  const analyticsTable = (rows = data?.departments || []) => <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Department", "Admin / vacancy", "Alumni", "Approved", "Pending", "Rejected", "Events"].map((label) => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((entry) => <tr key={entry.code} className="border-t"><td className="p-3 font-bold">{entry.code}</td><td className="p-3">{entry.admin?.name || "Vacant"}</td>{[entry.alumni, entry.approved, entry.pending, entry.rejected, entry.events].map((value, index) => <td className="p-3" key={index}>{value}</td>)}</tr>)}</tbody></table></div>;
  const exportAnalytics = () => {
    const headings = ["Department", "Admin", "Alumni", "Approved", "Pending", "Rejected", "Events"];
    const lines = [headings, ...analyticsRows.map((entry) => [entry.code, entry.admin?.name || "Vacant", entry.alumni, entry.approved, entry.pending, entry.rejected, entry.events])].map((row) => row.map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `cmrunite-analytics-${analyticsDepartment.toLowerCase()}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <main className="px-4 py-8"><section className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-2xl bg-slate-950 p-6 text-white"><h1 className="text-3xl font-black">Super Admin</h1><p className="mt-2 text-slate-300">Oversee departments, administrators and platform-wide updates.</p></header>
    <nav aria-label="Super Admin sections" className="flex flex-wrap gap-2">{Object.entries(tabs).map(([key, label]) => <button type="button" aria-pressed={tab === key} key={key} onClick={() => { setParams({ tab: key }); setSecret(""); setError(""); setMessage(""); }} className={`rounded-lg px-4 py-3 font-bold ${tab === key ? "bg-blue-700 text-white" : "bg-white text-slate-700"}`}>{label}</button>)}</nav>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{message}</p>}
    {secret && <section className="rounded-lg border border-amber-300 bg-amber-50 p-4"><h2 className="font-bold">Temporary password — shown once</h2><output aria-label="Temporary password" className="mt-2 block break-all font-mono">{secret}</output><p className="mt-2 text-sm">Share it securely. The admin must change it before using administrative tools.</p><button onClick={() => setSecret("")} className="mt-2 underline">Dismiss password</button></section>}
    {loading ? <p>Loading administration workspace...</p> : <>
      {tab === "dashboard" && <section className="surface-card p-5"><h2 className="text-2xl font-bold">Dashboard</h2><div className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Alumni", data?.totals.alumni], ["Active department admins", data?.totals.admins], ["Events", data?.totals.events], ["Platform events", data?.totals.platformEvents], ["Unassigned events", data?.totals.unassignedEvents]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-4"><p>{label}</p><strong className="text-2xl">{value}</strong></div>)}</div>{analyticsTable()}</section>}
      {tab === "analytics" && <section className="space-y-5">
        <div className="surface-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">Analytics</h2><p className="mt-1 text-sm text-slate-600">Compare alumni, approvals, events and administrator coverage across departments.</p></div><button type="button" onClick={exportAnalytics} className="primary-button">Export CSV</button></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3"><label className="text-sm font-bold text-slate-700">Department<select className={`${input} mt-2`} value={analyticsDepartment} onChange={(event) => setAnalyticsDepartment(event.target.value)}><option value="all">All departments</option>{(data?.departments || []).map((entry) => <option key={entry.code} value={entry.code}>{entry.code}</option>)}</select></label><label className="text-sm font-bold text-slate-700">Alumni status<select className={`${input} mt-2`} value={analyticsStatus} onChange={(event) => setAnalyticsStatus(event.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-bold text-slate-700">Display<select className={`${input} mt-2`} value={analyticsView} onChange={(event) => setAnalyticsView(event.target.value)}><option value="all">Charts and table</option><option value="charts">Charts only</option><option value="table">Table only</option></select></label></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[statusLabels[analyticsStatus], analyticsTotals.alumni], ["Active department admins", analyticsTotals.admins], [analyticsDepartment === "all" ? "All events" : "Department events", filteredEventTotal], ["Pending approvals", analyticsTotals.pending]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-600">{label}</p><strong className="text-2xl">{value}</strong></div>)}</div>
        </div>
        {analyticsView !== "table" && <div className="grid gap-5 lg:grid-cols-2"><HorizontalBars title={`${statusLabels[analyticsStatus]} by department`} rows={analyticsRows} valueKey={alumniMetric} /><ApprovalBars rows={analyticsRows} /><HorizontalBars title="Events by owning department" rows={analyticsEventRows} valueKey="events" color="bg-violet-600" /><AdminCoverage rows={analyticsRows} /></div>}
        {analyticsView !== "charts" && <section className="surface-card p-5"><h3 className="text-xl font-bold">Detailed department data</h3><div className="mt-4">{analyticsTable(analyticsRows)}</div></section>}
      </section>}
      {tab === "departments" && <fieldset disabled={busy} className="surface-card space-y-5 p-5"><h2 className="text-2xl font-bold">Departments</h2><form onSubmit={(event) => { event.preventDefault(); action(() => api.post("/super-admin/departments", departmentForm), "Department created"); }} className="grid gap-3 md:grid-cols-3"><input aria-label="Department code" placeholder="Department code, e.g. CSE" required value={departmentForm.code} onChange={(event) => setDepartmentForm((current) => ({ ...current, code: event.target.value }))} className={input} /><input aria-label="Department name" placeholder="Department name" required value={departmentForm.name} onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))} className={input} /><button className="primary-button">Create department</button></form>{departments.map((entry) => <article key={entry._id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-bold">{entry.code} — {entry.name}</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${entry.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{entry.isActive ? "Active" : "Archived"}</span></div><div className="mt-3 flex flex-wrap gap-3"><input aria-label={`Rename ${entry.code}`} className={input} value={renames[entry._id] ?? entry.name} onChange={(event) => setRenames((current) => ({ ...current, [entry._id]: event.target.value }))} /><button onClick={() => action(() => api.patch(`/super-admin/departments/${entry._id}`, { name: renames[entry._id] ?? entry.name }), "Department renamed")}>Save name</button><button onClick={() => action(() => api.patch(`/super-admin/departments/${entry._id}`, { isActive: !entry.isActive }), "Department status updated")}>{entry.isActive ? "Archive" : "Reactivate"}</button></div></article>)}</fieldset>}
      {tab === "admins" && <fieldset disabled={busy} className="surface-card space-y-5 p-5"><h2 className="text-2xl font-bold">Department Admins</h2><form onSubmit={(event) => { event.preventDefault(); action(() => api.post("/super-admin/admins", adminForm), "Admin created"); }} className="grid gap-3 md:grid-cols-2"><input aria-label="Admin name" placeholder="Admin name" required value={adminForm.name} onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))} className={input} /><input aria-label="Admin email" placeholder="Admin email" type="email" required value={adminForm.email} onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))} className={input} />{departmentSelect(adminForm.department, (value) => setAdminForm((current) => ({ ...current, department: value })), "Admin department")}<button className="primary-button">Create admin</button></form>{admins.map((entry) => <article key={entry._id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{entry.name}</h3><p className="text-sm text-slate-600">{entry.email} · {entry.department?.code || "Unassigned"}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${entry.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{entry.isActive ? "Active" : "Inactive"}</span></div><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={!entry.isActive} onClick={() => action(() => api.patch(`/super-admin/admins/${entry._id}`, { isActive: false }), "Admin deactivated; sessions revoked")} className="rounded-lg border border-rose-300 px-4 py-2 font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">Deactivate Admin</button><button type="button" disabled={entry.isActive} onClick={() => action(() => api.patch(`/super-admin/admins/${entry._id}`, { isActive: true }), "Admin activated")} className="rounded-lg border border-emerald-300 px-4 py-2 font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Activate Admin</button><button type="button" disabled={!entry.isActive} onClick={() => { setReplacingAdmin(entry._id); setReplacementForm({ name: "", email: "" }); }} className="rounded-lg border border-blue-300 px-4 py-2 font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Replace Admin</button><button type="button" disabled={!entry.isActive} onClick={() => action(() => api.post(`/super-admin/admins/${entry._id}/reset-password`), "Temporary password issued; sessions revoked")} className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Reset Password</button></div>{replacingAdmin === entry._id && <form onSubmit={async (event) => { event.preventDefault(); const succeeded = await action(() => api.post(`/super-admin/admins/${entry._id}/replace`, replacementForm), "Department admin replaced; previous sessions revoked"); if (succeeded) { setReplacingAdmin(""); setReplacementForm({ name: "", email: "" }); } }} className="mt-4 grid gap-3 rounded-lg bg-blue-50 p-4 md:grid-cols-2"><p className="md:col-span-2 text-sm text-blue-900">The new administrator will be assigned to {entry.department?.code}. The current administrator will be deactivated.</p><input aria-label={`Replacement name for ${entry.email}`} placeholder="Replacement name" required value={replacementForm.name} onChange={(event) => setReplacementForm((current) => ({ ...current, name: event.target.value }))} className={input} /><input aria-label={`Replacement email for ${entry.email}`} placeholder="Replacement email" type="email" required value={replacementForm.email} onChange={(event) => setReplacementForm((current) => ({ ...current, email: event.target.value }))} className={input} /><div className="flex gap-3 md:col-span-2"><button className="primary-button">Confirm Replacement</button><button type="button" onClick={() => setReplacingAdmin("")} className="rounded-lg border px-4 py-2 font-bold">Cancel</button></div></form>}</article>)}</fieldset>}
      {tab === "announcements" && <SendMail />}
      {tab === "audit" && <section className="surface-card p-5"><h2 className="text-2xl font-bold">Audit Log</h2><div className="mt-4 space-y-3">{audit.entries.map((entry) => <article key={entry._id} className="rounded-lg border p-3"><strong>{entry.action}</strong><p className="break-all text-sm">{entry.actor?.name || "Operator"} · {entry.department?.code || "Platform"} · {new Date(entry.createdAt).toLocaleString()}</p><p className="break-all text-xs text-slate-500">Record: {entry.target}</p></article>)}</div>{pageControls(audit.pagination, auditPage, setAuditPage, "Audit pages")}</section>}
      {tab === "unassigned" && <fieldset disabled={busy} className="surface-card space-y-4 p-5"><h2 className="text-2xl font-bold">Unassigned Records</h2><select aria-label="Unassigned record type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className={input}>{["alumni", "admins", "events", "announcements"].map((value) => <option key={value}>{value}</option>)}</select>{unassigned.records.map((entry) => <article key={entry._id} className="rounded-lg border p-4"><h3 className="font-bold">{entry.title || entry.name || [entry.firstName, entry.lastName].filter(Boolean).join(" ") || entry.email}</h3><p className="text-sm">{entry.email || entry.branch}</p><div className="mt-3 flex flex-wrap gap-3">{departmentSelect(targets[entry._id], (value) => setTargets((current) => ({ ...current, [entry._id]: value })), `Assign ${entry._id}`)}<button disabled={!targets[entry._id]} onClick={() => action(() => type === "admins" ? api.post("/super-admin/admins", { name: entry.name || entry.email, email: entry.email, department: targets[entry._id], existingUserId: entry._id }) : api.patch(`/super-admin/assign/${type}/${entry._id}`, { department: targets[entry._id] }), "Record assigned")}>{type === "admins" ? "Provision department admin" : "Assign department"}</button></div></article>)}{!unassigned.records.length && <p>No unassigned records.</p>}{pageControls(unassigned.pagination, page, setPage, "Unassigned pages")}</fieldset>}
    </>}
  </section></main>;
}
