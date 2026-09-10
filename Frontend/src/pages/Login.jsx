import "react-toastify/dist/ReactToastify.css";
import { useState } from "react";
import Select from "react-select";
import { ToastContainer, toast } from "react-toastify";
import api from "../services/api";
import { login } from "../features/authSlice";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import Loader from "../Components/Loader";
import graduationIllustration from "../assets/img/graduation_illustration.svg";

function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const [user, setUser] = useState({
    email: "",
    password: "",
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const roleOptions = [
    { value: "alumni", label: "Alumni" },
    { value: "admin", label: "Admin" },
  ];

  const handleRoleChange = (selectedOption) => {
    setSelectedRole(selectedOption);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setLoading(true);

    const url = "/auth/login";

    const userData = {
      email: user.email,
      password: user.password,
      role: selectedRole.value,
    };

    try {
      const response = await api.post(url, userData);

      const payload = {
        ...(selectedRole.value === "alumni"
          ? response.data.alumni
          : response.data.admin),
        role: selectedRole.value,
      };

      dispatch(login(payload));

      toast.success("Login Successful");

      navigate("/dashboard");
    } catch (err) {
      if (err.response) {
        toast.error(err.response.data.message || "Login failed");
      } else {
        toast.error("Backend not reachable. Check server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer />

      <main className="relative grid min-h-[calc(100vh-76px)] place-items-center overflow-hidden px-4 py-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(79,70,229,0.15),transparent_30rem),radial-gradient(circle_at_90%_90%,rgba(20,184,166,0.12),transparent_28rem)]" />
        <section className="surface-card mx-auto grid w-full max-w-5xl overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="relative hidden overflow-hidden bg-[#101936] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="eyebrow text-teal-300">Welcome home</p>
              <h1 className="mt-4 text-4xl font-black leading-tight">
                Your alumni community is waiting.
              </h1>
              <p className="mt-4 font-semibold leading-7 text-slate-300">
                Reconnect with peers, discover mentors, and keep your CMRIT network close.
              </p>
            </div>
            <img src={graduationIllustration} alt="" className="mx-auto mt-8 h-64 w-full object-contain" />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Trusted · Verified · Connected
            </p>
          </aside>
          <form onSubmit={handleSubmit} className="space-y-5 p-7 sm:p-10 lg:p-12">
            <div>
              <p className="eyebrow">Member access</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Sign in to your account
              </h2>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                New to CMReunite?{" "}
                <Link to="/register" className="text-blue-700 hover:underline">
                  Create an account
                </Link>
              </p>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">
                Email
              </span>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={user.email}
                onChange={handleChange}
                required
                className="form-control"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">
                Password
              </span>
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={user.password}
                onChange={handleChange}
                required
                className="form-control"
              />
              <Link to="/forgot-password" className="mt-2 block text-right text-xs font-bold text-indigo-700">Forgot password?</Link>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">
                Role
              </span>
              <Select
                options={roleOptions}
                value={selectedRole}
                onChange={handleRoleChange}
                placeholder="Select your role"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    minHeight: 52,
                    borderRadius: 12,
                    borderColor: state.isFocused ? "#6366f1" : "#cbd5e1",
                    boxShadow: state.isFocused ? "0 0 0 4px #e0e7ff" : "none",
                  }),
                }}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="primary-button w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader text="Please Wait..." /> : "Sign In"}
            </button>
          </form>
        </section>
      </main>
    </>
  );
}

export default Login;
