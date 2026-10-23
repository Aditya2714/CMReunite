import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaKey, FaLaptop, FaShieldAlt, FaSignOutAlt } from "react-icons/fa";
import api from "../services/api";
import { logout } from "../features/authSlice";

function AccountSecurity() {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const load = () => api.get("/auth/sessions").then(({ data }) => setSessions(data.data.sessions));
  useEffect(() => { load(); }, []);
  const changePassword = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) return setMessage("New passwords do not match.");
    try {
      const { data } = await api.post("/auth/change-password", {
        currentPassword: form.currentPassword, newPassword: form.newPassword,
      });
      setMessage(data.message); setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      if (data.requiresLogin) { dispatch(logout()); navigate("/login"); } else load();
    } catch (error) { setMessage(error.response?.data?.message || "Unable to change password."); }
  };
  const revoke = async (session) => {
    await api.delete(`/auth/sessions/${session._id}`);
    if (session.current) { dispatch(logout()); navigate("/login"); } else load();
  };
  const logoutAll = async () => {
    await api.post("/auth/logout-all");
    dispatch(logout()); navigate("/login");
  };
  return (
    <main className="px-4 py-9">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[2rem] bg-[#101936] p-8 text-white">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-teal-300"><FaShieldAlt /> Secure account management</p>
          <h1 className="mt-3 text-4xl font-black">Protect your CMRunite account.</h1>
          <p className="mt-3 text-sm font-semibold text-slate-300">Change your password, review signed-in devices and revoke access you no longer recognize.</p>
        </header>
        {message && <p role="status" className="rounded-xl bg-indigo-50 p-4 text-sm font-bold text-indigo-700">{message}</p>}
        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={changePassword} className="surface-card p-6">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><FaKey className="text-indigo-600" /> Change password</h2>
            <div className="mt-5 space-y-3">
              <input type="password" aria-label="Current password" placeholder="Current password" value={form.currentPassword} onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))} className="form-control" required />
              <input type="password" aria-label="New password" placeholder="New secure password" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} className="form-control" required />
              <input type="password" aria-label="Confirm password" placeholder="Confirm new password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} className="form-control" required />
              <p className="text-xs font-semibold text-slate-500">Minimum 10 characters with uppercase, lowercase, number and symbol.</p>
              <button className="primary-button w-full">Update password</button>
            </div>
          </form>
          <article className="surface-card p-6">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><FaLaptop className="text-indigo-600" /> Login history</h2><button onClick={logoutAll} className="text-xs font-black text-red-600">Sign out everywhere</button></div>
            <div className="mt-5 space-y-3">
              {sessions.map((session) => (
                <div key={session._id} className={`rounded-xl border p-4 ${session.active ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-800">{session.current ? "Current device" : session.userAgent}</p><p className="mt-1 text-xs font-semibold text-slate-500">{session.ipAddress || "IP unavailable"} · Last active {new Date(session.lastSeenAt).toLocaleString("en-IN")}</p></div>
                    {session.active && <button aria-label={`Sign out ${session.current ? "current device" : "session"}`} onClick={() => revoke(session)} className="text-red-600"><FaSignOutAlt /></button>}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
export default AccountSecurity;
