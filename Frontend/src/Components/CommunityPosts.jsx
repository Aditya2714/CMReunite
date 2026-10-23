import { useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import api from "../services/api";
import { useCurrentUser } from "../services/authService";
const fresh = (postType = "story") => ({ postType, title: "", content: "", category: "Career Journey", company: "", location: "", employmentType: "Full-time", vacancy: "1", status: "Open" });
const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900";
export default function CommunityPosts() {
  const user = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const filter = ["story", "job"].includes(params.get("type")) ? params.get("type") : "all";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [posts, setPosts] = useState([]), [pages, setPages] = useState(1);
  const [form, setForm] = useState(null), [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const [emailStatus, setEmailStatus] = useState("loading"), [revision, setRevision] = useState(0);
  const canPublish = user?.role === "alumni";
  useEffect(() => {
    api.get("/posts/settings").then((response) => setEmailStatus(response.data.data.status)).catch(() => setEmailStatus("unavailable"));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const load = async () => {
      try {
        const response = await api.get("/posts", { params: { ...(filter !== "all" ? { postType: filter } : {}), page, limit: 20 }, signal: controller.signal });
        let items = response.data.data.posts;
        const id = location.hash.match(/^#post-([a-f\d]{24})$/i)?.[1];
        if (id && !items.some((post) => post._id === id)) {
          try {
            const target = (await api.get(`/posts/${id}`, { signal: controller.signal })).data.data.post;
            if (filter === "all" || filter === target.postType) items = [target, ...items];
          } catch (failure) { if (failure.code === "ERR_CANCELED") return; }
        }
        if (controller.signal.aborted) return;
        setPosts(items); setPages(response.data.data.pagination.pages || 1);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.response?.data?.message || "Unable to load community posts.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [filter, page, location.hash, revision]);
  useEffect(() => { if (!loading && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView(); }, [loading, location.hash, posts]);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError(""); setMessage(""); setSaving(true);
    const payload = { postType: form.postType, title: form.title, content: form.content,
      ...(form.postType === "story" ? { category: form.category } : { company: form.company, location: form.location, employmentType: form.employmentType, status: form.status, vacancy: Number(form.vacancy) }) };
    try {
      const response = editing ? await api.patch(`/posts/${editing}`, payload) : await api.post("/posts", payload);
      setMessage(editing ? "Post updated successfully." : form.postType === "story" ? "Story published successfully." : response.data.data.placementNotification.status === "queued" ? "Job posted successfully. Placement-office email notification is queued." : "Job posted successfully. Placement-office email notifications are currently unavailable.");
      setParams({ type: form.postType }); setForm(null); setEditing(null); setRevision((value) => value + 1);
    } catch (failure) { setError(failure.response?.data?.message || "Unable to save your post. Please try again."); }
    finally { setSaving(false); }
  };
  const edit = (post) => { setEditing(post._id); setForm({ ...fresh(post.postType), ...post, vacancy: String(post.vacancy || 1) }); setMessage(""); setError(""); window.scrollTo({ top: 0 }); };
  const remove = async (post) => {
    if (saving) return;
    setSaving(true); setError("");
    try {
      await api.delete(`/posts/${post._id}`);
      if (editing === post._id) { setEditing(null); setForm(null); }
      setMessage("Post deleted successfully."); setRevision((value) => value + 1);
    } catch (failure) { setError(failure.response?.data?.message || "Unable to delete this post."); }
    finally { setSaving(false); }
  };
  const field = (name, label, extra = {}) => <label className="block text-sm font-bold text-slate-700">{label}<input aria-label={label} name={name} value={form[name]} onChange={change} className={inputClass} {...extra} /></label>;
  const notice = {
    enabled: "New job postings are automatically shared with the placement office by email.",
    disabled: "Placement-office email notifications are currently disabled. You can still publish jobs.",
    not_configured: "Placement-office email notifications are not yet configured. You can still publish jobs.",
    loading: "Checking placement-office notifications...", unavailable: "Placement-office notification status is unavailable. You can still publish jobs.",
  }[emailStatus];
  return <main className="bg-slate-50 px-4 py-8"><section className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-lg bg-slate-950 p-6 text-white"><p className="text-sm font-bold text-teal-200">Alumni community</p><h1 className="mt-2 text-3xl font-extrabold">Community Posts</h1><p className="mt-3 text-slate-300">Share your story, discover opportunities, and stay connected.</p></header>
    {message && <p role="status" className="rounded-lg bg-green-50 p-4 font-semibold text-green-800">{message}</p>}
    {error && <p role="alert" className="whitespace-pre-wrap break-words rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
    {canPublish && !form && <button type="button" onClick={() => { setForm(fresh(filter === "job" ? "job" : "story")); setEditing(null); setError(""); }} className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white">Create Post</button>}
    {form && <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-2xl font-extrabold">{editing ? "Edit post" : "Create a community post"}</h2>
      <fieldset disabled={saving} className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold text-slate-700">Post type<select aria-label="Post type" name="postType" value={form.postType} disabled={Boolean(editing)} onChange={(event) => setForm((current) => ({ ...fresh(event.target.value), title: current.title, content: current.content }))} className={inputClass}><option value="story">Story</option><option value="job">Job Opportunity</option></select></label>
        {field("title", "Title", { required: true, maxLength: 200 })}
        {form.postType === "story" ? <label className="block text-sm font-bold text-slate-700">Category<select aria-label="Category" name="category" value={form.category} onChange={change} className={inputClass}>{[...new Set(["Career Journey", "Founder Story", "Higher Studies", "Achievement", "Campus Memory", form.category])].map((value) => <option key={value}>{value}</option>)}</select></label> : <>
          {!editing && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 md:col-span-2">{notice}</p>}
          {field("company", "Company", { required: true, maxLength: 200 })}{field("location", "Location", { maxLength: 200 })}
          <label className="block text-sm font-bold text-slate-700">Job type<select aria-label="Job type" name="employmentType" value={form.employmentType} onChange={change} className={inputClass}>{[...new Set(["Full-time", "Internship", "Contract", "Referral", form.employmentType])].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="block text-sm font-bold text-slate-700">Job status<select aria-label="Job status" name="status" value={form.status} onChange={change} className={inputClass}>{[...new Set(["Open", "Referral available", "New", "Closed", form.status])].map((value) => <option key={value}>{value}</option>)}</select></label>
          {field("vacancy", "Vacancies", { required: true, type: "number", min: 1, max: 10000 })}
        </>}
        <label className="block text-sm font-bold text-slate-700 md:col-span-2">{form.postType === "story" ? "Story content" : "Job description"}<textarea aria-label={form.postType === "story" ? "Story content" : "Job description"} name="content" required maxLength={10000} value={form.content} onChange={change} rows={5} className={inputClass} /></label>
      </fieldset>
      {editing && <p className="mt-3 text-sm text-slate-500">Post type is fixed after publishing. Editing does not send placement-office emails.</p>}
      <div className="mt-4 flex gap-3"><button disabled={saving} className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : editing ? "Update Post" : "Publish Post"}</button><button type="button" disabled={saving} onClick={() => { setForm(null); setEditing(null); setError(""); }} className="rounded-lg border border-slate-300 px-5 py-3 font-bold">Cancel</button></div>
    </form>}
    <nav aria-label="Filter community posts" className="flex flex-wrap gap-3">{[["all", "All"], ["story", "Stories"], ["job", "Jobs"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setError(""); setParams(value === "all" ? {} : { type: value }); }} className={`rounded-lg border px-5 py-3 font-bold ${filter === value ? "bg-blue-700 text-white" : "bg-white text-slate-700"}`}>{label}</button>)}</nav>
    {loading ? <p>Loading community posts...</p> : <>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <article id={`post-${post._id}`} key={post._id} className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${post.postType === "job" ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-800"}`}>{post.postType === "job" ? "Job" : "Story"}</span>
        <h2 className="mt-3 break-words text-xl font-extrabold">{post.title}</h2><p className="mt-2 text-sm text-slate-500">By {post.authorName} · {new Date(post.createdAt).toLocaleDateString()}</p>
        {post.postType === "story" ? <p className="mt-2 font-semibold text-teal-800">{post.category}</p> : <div className="mt-3 space-y-1 text-sm text-slate-600"><p>{post.company} · {post.location}</p><p>{post.employmentType} · {post.status}</p><p>Vacancies: {post.vacancy}</p></div>}
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{post.content}</p>
        {post.canManage && <div className="mt-4 flex gap-3"><button type="button" disabled={saving} onClick={() => edit(post)} className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white">Edit</button><button type="button" disabled={saving} onClick={() => remove(post)} className="rounded-lg border border-red-200 px-4 py-2 font-bold text-red-700">Delete</button></div>}
      </article>)}</section>
      {!posts.length && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No community posts found.</p>}
      {pages > 1 && <nav aria-label="Post pages" className="flex items-center gap-4"><button disabled={page <= 1} onClick={() => setParams({ ...(filter !== "all" ? { type: filter } : {}), page: String(page - 1) })}>Previous</button><span>Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setParams({ ...(filter !== "all" ? { type: filter } : {}), page: String(page + 1) })}>Next</button></nav>}
    </>}
  </section></main>;
}
