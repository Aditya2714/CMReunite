import { useEffect, useState } from "react";
import { FaBan, FaDownload, FaLock, FaShieldAlt, FaUserFriends } from "react-icons/fa";
import api from "../services/api";

const defaults = {
  profileVisibility: "members",
  showEmail: false,
  showPhone: false,
  allowMessages: "connections",
  allowConnections: true,
  mentorshipAvailable: true,
};

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <span><strong className="block text-slate-900">{label}</strong><span className="mt-1 block text-xs font-semibold text-slate-500">{description}</span></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-indigo-600" />
    </label>
  );
}

function PrivacyCenter() {
  const [privacy, setPrivacy] = useState(defaults);
  const [blocked, setBlocked] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/profile/privacy");
      setPrivacy({ ...defaults, ...(data.data.privacy || {}) });
      setBlocked(data.data.blockedUsers || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load privacy settings.");
    }
  };
  useEffect(() => { load(); }, []);

  const set = (field, value) => setPrivacy((current) => ({ ...current, [field]: value }));
  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/profile/privacy", privacy);
      setPrivacy({ ...defaults, ...data.data.privacy });
      setMessage("Privacy preferences saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save privacy settings.");
    } finally {
      setSaving(false);
    }
  };
  const unblock = async (id) => {
    await api.delete(`/profile/blocked/${id}`);
    setBlocked((current) => current.filter((user) => user._id !== id));
    setMessage("User unblocked.");
  };
  const exportData = async () => {
    const response = await api.get("/profile/export", { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cmreunite-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="px-4 py-9">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[2rem] bg-[#101936] p-7 text-white md:p-10">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-teal-300"><FaShieldAlt /> Privacy and trust centre</p>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">Your network, your boundaries.</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Control who sees your profile, who can contact you, and export a copy of your platform data.</p>
        </header>
        {message && <p className="rounded-xl bg-indigo-50 p-4 text-sm font-bold text-indigo-700">{message}</p>}
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><FaLock className="text-indigo-600" /> Visibility</h2>
            <label className="mt-5 block text-sm font-bold text-slate-600">Who can discover your profile?
              <select value={privacy.profileVisibility} onChange={(event) => set("profileVisibility", event.target.value)} className="form-control mt-2">
                <option value="members">All approved members</option>
                <option value="network">Accepted connections only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <div className="mt-4 space-y-3">
              <Toggle label="Show email" description="Expose email on directory results." checked={privacy.showEmail} onChange={(value) => set("showEmail", value)} />
              <Toggle label="Show phone" description="Expose phone number on directory results." checked={privacy.showPhone} onChange={(value) => set("showPhone", value)} />
              <Toggle label="Accept connections" description="Allow new connection requests." checked={privacy.allowConnections} onChange={(value) => set("allowConnections", value)} />
              <Toggle label="Available for mentorship" description="Appear in mentor discovery." checked={privacy.mentorshipAvailable} onChange={(value) => set("mentorshipAvailable", value)} />
            </div>
          </article>
          <div className="space-y-6">
            <article className="surface-card p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><FaUserFriends className="text-indigo-600" /> Messaging</h2>
              <select value={privacy.allowMessages} onChange={(event) => set("allowMessages", event.target.value)} className="form-control mt-5">
                <option value="connections">Accepted connections only</option>
                <option value="members">All approved members</option>
                <option value="none">No one</option>
              </select>
              <button onClick={save} disabled={saving} className="primary-button mt-5 w-full">{saving ? "Saving…" : "Save preferences"}</button>
            </article>
            <article className="surface-card p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><FaBan className="text-red-500" /> Blocked users</h2>
              <div className="mt-4 space-y-2">
                {blocked.map((user) => <div key={user._id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm font-bold text-slate-700">{user.name || user.email}</span><button onClick={() => unblock(user._id)} className="text-xs font-black text-red-600">Unblock</button></div>)}
                {!blocked.length && <p className="text-sm font-semibold text-slate-500">You have not blocked anyone.</p>}
              </div>
            </article>
            <article className="rounded-2xl bg-teal-50 p-6">
              <h2 className="font-black text-slate-900">Download your data</h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">Export your account, profile, connections, mentorships, referrals, event registrations and conversation metadata.</p>
              <button onClick={exportData} className="secondary-button mt-5 w-full"><FaDownload /> Export JSON</button>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

export default PrivacyCenter;
