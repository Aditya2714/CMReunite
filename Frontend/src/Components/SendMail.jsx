import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaBullhorn,
  FaEdit,
  FaPaperPlane,
  FaPaperclip,
  FaTimes,
  FaTrash,
  FaImage,
  FaFilePdf,
} from "react-icons/fa";
import { useCurrentUser } from "../services/authService";
import Loader from "./Loader";

const branchOptions = ["All branches", "CSE", "ISE", "ECE", "EEE", "ME", "CV"];
const batchOptions = ["All batches", "2024", "2023", "2022", "2021", "2020"];

const formatAnnouncementForUi = (item) => ({
  id: item._id,
  title: item.title,
  branch: item.branch || "All branches",
  batch: item.batch || "All batches",
  message: item.message,
  attachmentUrl: item.attachmentUrl || null,
  attachmentType: item.attachmentType || null,
  status: "Published",
});

function Announcements() {
  const user = useCurrentUser() || {};
  const isAdmin = user.role === "admin";
  const [title, setTitle] = useState("");
  const [branch, setBranch] = useState("All branches");
  const [batch, setBatch] = useState("All batches");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const response = await api.get("/announcements");
        setItems(response.data.data.announcements.map(formatAnnouncementForUi));
      } catch (error) {
        console.error("Announcements fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const resetForm = () => {
    setTitle("");
    setBranch("All branches");
    setBatch("All batches");
    setMessage("");
    setAttachment(null);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSubmitting(true);
    setStatusMsg("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("branch", branch);
      formData.append("batch", batch);
      formData.append("message", message);
      if (attachment) {
        formData.append("attachment", attachment);
      }

      if (editingId) {
        await api.patch(`/announcements/${editingId}`, {
          title, branch, batch, message,
        });
        setStatusMsg("Announcement updated.");
      } else {
        await api.post("/announcements", formData);
        setStatusMsg("Announcement published. Emails triggered to matching alumni.");
      }

      const response = await api.get("/announcements");
      setItems(response.data.data.announcements.map(formatAnnouncementForUi));
      resetForm();
    } catch (err) {
      setStatusMsg(err.response?.data?.message || "Failed to save announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setTitle(item.title);
    setBranch(item.branch);
    setBatch(item.batch);
    setMessage(item.message);
    setAttachment(null);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
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
            Share updates with the alumni community.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            Create targeted announcements for alumni by branch and batch.
          </p>
          {loading && (
            <p className="mt-3 text-sm font-semibold text-teal-100">
              Loading announcements from database...
            </p>
          )}
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
                  {editingId ? "Edit announcement" : "New announcement"}
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  {editingId
                    ? "Update the selected announcement."
                    : "Choose an audience and prepare the update."}
                </p>
              </div>
            </div>

            {statusMsg && (
              <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
                {statusMsg}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Title
                </span>
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Announcement title"
                  required
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Branch
                </span>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={inputClass}
                >
                  {branchOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Batch
                </span>
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className={inputClass}
                >
                  {batchOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
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

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Message
                </span>
                <textarea
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows="4"
                  placeholder="Write the update for the selected audience."
                  required
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Loader text={editingId ? "Updating" : "Publishing"} />
                ) : (
                  <>
                    <FaPaperPlane />{" "}
                    {editingId ? "Update Announcement" : "Publish & Notify"}
                  </>
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 font-extrabold text-slate-900 transition hover:border-slate-900"
                >
                  <FaTimes /> Cancel
                </button>
              )}
            </div>
          </form>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
            Updates
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            Recent announcements
          </h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-900">
                      {item.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                        {item.branch}
                      </span>
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-extrabold text-purple-700">
                        Batch: {item.batch}
                      </span>
                      {item.attachmentUrl && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                          {item.attachmentType === "image" ? <FaImage /> : <FaFilePdf />}
                          Attachment
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  {item.message}
                </p>
                {item.attachmentUrl && item.attachmentType === "image" && (
                  <img
                    src={item.attachmentUrl}
                    alt="Attachment"
                    className="mt-3 max-h-48 rounded-lg border border-slate-200 object-cover"
                  />
                )}
                {item.attachmentUrl && item.attachmentType === "pdf" && (
                  <a
                    href={item.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    <FaFilePdf /> View / Download PDF
                  </a>
                )}
                {item.attachmentUrl && !item.attachmentType && (
                  <a
                    href={item.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-100"
                  >
                    <FaPaperclip /> View Attachment
                  </a>
                )}

                {isAdmin && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 font-extrabold text-red-700 transition hover:bg-red-100"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>

          {!loading && !items.length && (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <h3 className="text-xl font-extrabold text-slate-900">
                No announcements posted yet
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Announcements will appear here after an admin publishes them.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Announcements;
