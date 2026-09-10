import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to request a reset link.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="grid min-h-[70vh] place-items-center px-4 py-12">
      <form onSubmit={submit} className="surface-card w-full max-w-md p-8">
        <p className="eyebrow">Account recovery</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Forgot your password?</h1>
        <p className="mt-3 text-sm font-semibold text-slate-500">Enter your account email. For privacy, the response is the same whether an account exists or not.</p>
        <label className="mt-6 block text-sm font-bold text-slate-600">Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="form-control mt-2" />
        </label>
        <button disabled={loading} className="primary-button mt-5 w-full">{loading ? "Requesting…" : "Send reset link"}</button>
        {message && <p role="status" className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm font-bold text-indigo-700">{message}</p>}
        <Link to="/login" className="mt-5 block text-center text-sm font-bold text-indigo-700">Back to sign in</Link>
      </form>
    </main>
  );
}
export default ForgotPassword;
