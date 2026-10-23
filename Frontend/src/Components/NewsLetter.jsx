import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaBullhorn,
  FaPaperclip,
  FaTrash,
  FaImage,
  FaFilePdf,
} from "react-icons/fa";
import { useCurrentUser } from "../services/authService";
import Loader from "./Loader";

const branchOptions = [
  "All branches",
  "CSE",
  "ISE",
  "ECE",
  "EEE",
  "ME",
  "CV",
];

const batchOptions = [
  "All batches",
  "2024",
  "2023",
  "2022",
  "2021",
  "2020",
];

function NewsLetter() {
  const user = useCurrentUser() || {};
  const isAdmin = ["admin", "super_admin"].includes(user.role);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [branch, setBranch] = useState("All branches");
  const [batch, setBatch] = useState("All batches");
  const [msg, setMsg] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get("/announcements");
      setAnnouncements(res.data.data.announcements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !msg.trim()) return;

    setSubmitting(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("branch", branch);
      formData.append("batch", batch);
      formData.append("message", msg);
      if (attachment) {
        formData.append("attachment", attachment);
      }

      await api.post("/announcements", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Announcement published. Emails triggered to alumni.");
      setTitle("");
      setMsg("");
      setBranch("All branches");
      setBatch("All batches");
      setAttachment(null);
      fetchAnnouncements();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to publish");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
            Announcements
          </p>
          <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
            Stay updated with CMRunite
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            {isAdmin
              ? "Create announcements and notify alumni via email instantly."
              : "View announcements from the admin team."}
          </p>
        </div>

        {isAdmin && (
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <FaBullhorn />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  New Announcement
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  Publish and trigger email to all alumni
                </p>
              </div>
            </div>

            {message && (
              <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
                {message}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                required
                className={inputClass}
              />
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className={inputClass}
              >
                {branchOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    Branch: {opt}
                  </option>
                ))}
              </select>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className={inputClass}
              >
                {batchOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    Batch: {opt}
                  </option>
                ))}
              </select>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows="4"
                placeholder="Write your announcement message..."
                required
                className={`${inputClass} md:col-span-2`}
              />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  <FaPaperclip className="mr-1 inline" /> Attachment (optional)
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setAttachment(e.target.files[0])}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-blue-700 hover:file:bg-blue-100"
                />
                {attachment && (
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Selected: {attachment.name}
                  </p>
                )}
              </label>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Loader text="Publishing" />
                ) : (
                  <>
                    <FaBullhorn /> Publish & Notify
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900">
            All Announcements
          </h2>

          {loading ? (
            <p className="text-sm font-bold text-slate-500">Loading...</p>
          ) : announcements.length > 0 ? (
            announcements.map((a) => (
              <article
                key={a._id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {a.title}
                      </h3>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                        {a.branch || "All branches"}
                      </span>
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-extrabold text-purple-700">
                        Batch: {a.batch || "All batches"}
                      </span>
                      {a.attachmentUrl && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                          {a.attachmentType === "image" ? (
                            <FaImage />
                          ) : (
                            <FaFilePdf />
                          )}
                          Attachment
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                      {a.message}
                    </p>
                    {a.attachmentUrl && a.attachmentType === "image" && (
                      <img
                        src={a.attachmentUrl}
                        alt="Attachment"
                        className="mt-3 max-h-48 rounded-lg border border-slate-200 object-cover"
                      />
                    )}
                    <p className="mt-3 text-xs font-semibold text-slate-400">
                      {new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDelete(a._id)}
                      className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-extrabold text-slate-900">
                No announcements yet
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {isAdmin
                  ? "Create your first announcement above."
                  : "Announcements from admin will appear here."}
              </p>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

export default NewsLetter;
