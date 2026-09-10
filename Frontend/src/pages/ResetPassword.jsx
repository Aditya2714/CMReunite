import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

function ResetPassword() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (form.password !== form.confirm) return setMessage("Passwords do not match.");
    try {
      const { data } = await api.post("/auth/reset-password", { token: params.get("token") || "", newPassword: form.password });
      setMessage(data.message); setSuccess(true);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to reset password.");
    }
  };
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-12">
      <form onSubmit={submit} className="surface-card w-full max-w-md p-8">
        <p className="eyebrow">Secure reset</p><h1 className="mt-2 text-3xl font-black text-slate-950">Create a new password</h1>
        <p className="mt-3 text-sm font-semibold text-slate-500">Use 10+ characters with uppercase, lowercase, number and symbol.</p>
        <input type="password" aria-label="New password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required className="form-control mt-6" />
        <input type="password" aria-label="Confirm new password" value={form.confirm} onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))} required className="form-control mt-3" />
        <button className="primary-button mt-5 w-full">Reset password</button>
        {message && <p role="status" className={`mt-4 rounded-xl p-4 text-sm font-bold ${success ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"}`}>{message}</p>}
        {success && <Link to="/login" className="mt-4 block text-center font-bold text-indigo-700">Sign in</Link>}
      </form>
    </main>
  );
}
export default ResetPassword;
