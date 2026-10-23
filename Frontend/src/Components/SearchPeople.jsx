import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { FaBuilding, FaMapMarkerAlt, FaSearch, FaUserPlus } from "react-icons/fa";
const keys = ["keyword", "company", "designation", "seniority", "batch", "branch", "location"];
const fromParams = (params) => Object.fromEntries(keys.map((key) => [key, params.get(key) || ""]));
const inputClass = "form-control";
export default function SearchPeople() {
  const [params, setParams] = useSearchParams();
  const search = params.toString();
  const [filters, setFilters] = useState(() => fromParams(params));
  const [alumni, setAlumni] = useState([]);
  const [options, setOptions] = useState([]);
  const [optionsError, setOptionsError] = useState("");
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api.get("/alumni/directory-options").then((response) => {
      if (active) { setOptions(response.data.data.seniorityOptions); setOptionsError(""); }
    }).catch(() => { if (active) setOptionsError("Career seniority choices could not be loaded. You can still search by designation."); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    const query = new URLSearchParams(search);
    setFilters(fromParams(query));
    const controller = new AbortController();
    setLoading(true); setError("");
    const payload = Object.fromEntries(keys.map((key) => [key, query.get(key) || ""]).filter(([, value]) => value));
    api.get("/alumni", { params: { ...payload, page: query.get("page") || 1, limit: 12 }, signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) { setAlumni(response.data.data.alumni); setPagination(response.data.data.pagination); }
      }).catch((failure) => {
        if (!controller.signal.aborted) { setAlumni([]); setError(failure.response?.data?.message || "Unable to search alumni. Please try again."); }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, revision]);
  const change = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    const next = Object.fromEntries(keys.map((key) => [key, filters[key].trim()]).filter(([, value]) => value));
    setParams(next);
    if (new URLSearchParams(next).toString() === search) setRevision((value) => value + 1);
  };
  const changePage = (page) => { const next = new URLSearchParams(params); next.set("page", String(page)); setParams(next); };
  const field = (name, label, placeholder, extra = {}) => <label className="block text-sm font-bold text-slate-600">{label}<input aria-label={label} name={name} value={filters[name]} onChange={change} maxLength={200} placeholder={placeholder} className={`${inputClass} mt-2`} {...extra} /></label>;
  return <main className="px-4 py-9"><section className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-[1.75rem] bg-gradient-to-br from-[#101936] via-[#172554] to-[#3157d5] p-7 text-white shadow-xl">
      <p className="text-sm font-bold text-teal-200">Alumni directory</p><h1 className="mt-3 text-3xl font-black">Find alumni by career, company, and graduation batch.</h1>
      <p className="mt-3 text-slate-300">Career seniority is based on the recorded current designation. Graduation batch is a separate academic filter.</p>
    </header>
    <form onSubmit={submit} className="surface-card p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {field("keyword", "Search", "Name, skill, company, designation...")}
        {field("company", "Company", "Microsoft")}
        {field("designation", "Designation", "Vice President, VP, Senior Engineer...")}
        <label className="block text-sm font-bold text-slate-600">Career seniority<select aria-label="Career seniority" name="seniority" value={filters.seniority} onChange={change} className={`${inputClass} mt-2`} disabled={!options.length}><option value="">All</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        {field("batch", "Graduation batch", "2020", { inputMode: "numeric", pattern: "[0-9]{4}", maxLength: 4, title: "Enter a four-digit graduation year" })}
        {field("branch", "Branch", "Computer Science")}
        {field("location", "Location", "Bengaluru")}
      </div>
      <p className="mt-4 text-sm text-slate-500">Designation search recognises VP / Vice President and common executive abbreviations such as CEO. Career groups describe the recorded title, not years of experience.</p>
      {optionsError && <p className="mt-3 text-sm text-amber-800">{optionsError}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button type="submit" className="primary-button"><FaSearch /> Search alumni</button><button type="button" onClick={() => { setFilters(fromParams(new URLSearchParams())); setParams({}); setRevision((value) => value + 1); }} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">Clear filters</button></div>
    </form>
    {error ? <section role="alert" className="surface-card p-5 text-red-700"><p>{error}</p><button type="button" onClick={() => setRevision((value) => value + 1)} className="mt-3 rounded-lg border px-4 py-2 font-bold">Retry</button></section> : loading ? <p role="status">Searching alumni...</p> : <>
      <p role="status" className="font-semibold text-slate-600">{pagination.total} alumni found</p>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{alumni.map((person) => {
        const name = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Alumni";
        const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
        return <article key={person._id} className="surface-card p-5">
          <div className="flex items-center gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-indigo-700 font-bold text-white">{person.imageUrl ? <img src={person.imageUrl} alt={`${name} profile`} className="h-full w-full object-cover" /> : initials}</div><div><h2 className="font-extrabold text-slate-900">{name}</h2><p className="text-sm text-slate-500">Batch {person.endYear || "Not added"} · {person.branch || "Not added"}</p></div></div>
          <div className="mt-4 space-y-2 text-sm text-slate-600"><p className="flex items-start gap-2"><FaBuilding className="mt-1 shrink-0 text-indigo-600" /><span>{person.designation || "Designation not added"} at {person.company || "Company not added"}</span></p><p className="flex items-center gap-2"><FaMapMarkerAlt className="text-indigo-600" />{person.location || "Location not added"}</p></div>
          {person.careerSeniority && <p className="mt-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">{person.careerSeniorityLabel}</p>}
          <Link to="/connections" className="primary-button mt-5 min-h-[42px] w-full"><FaUserPlus /> Connect</Link>
        </article>;
      })}</section>
      {!alumni.length && <p className="surface-card p-8 text-center font-bold text-slate-500">No alumni found for the selected filters.</p>}
      {pagination.pages > 1 && <nav aria-label="Directory pages" className="flex flex-wrap items-center gap-4"><button type="button" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Previous</button><span>Page {pagination.page} of {pagination.pages}</span><button type="button" disabled={pagination.page >= pagination.pages} onClick={() => changePage(pagination.page + 1)} className="rounded-lg border px-4 py-2 disabled:opacity-40">Next</button></nav>}
    </>}
  </section></main>;
}
