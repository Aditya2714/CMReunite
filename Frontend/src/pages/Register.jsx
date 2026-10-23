import "react-toastify/dist/ReactToastify.css";
import { useState, useEffect } from "react";
import api from "../services/api";
import Select from "react-select";
import { ToastContainer, toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import Loader from "../Components/Loader";
import OtpInput from "../Components/OtpInput";

function Register() {
  const [selectedDegree, setSelectedDegree] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  useEffect(() => { api.get("/departments").then((response) => setDepartments(response.data.data.departments)).catch(() => setDepartments([])); }, []);

  const [step, setStep] = useState(1);
  const [otpValue, setOtpValue] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    startYear: "",
    endYear: "",
    degree: "",
    branch: "",
    department: "",
    rollNumber: "",
    firstName: "",
    lastName: "",
    role: "",
    linkedinUrl: "",
    designation: "",
    domain: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  const roleOptions = [
    { value: "alumni", label: "Alumni" },
  ];

  const degreeOptions = [
    { value: "bachelor", label: "Bachelor" },
    { value: "master", label: "Master" },
    { value: "phd", label: "PhD" },
  ];

  const domainOptions = [
    { value: "Information Technology", label: "Information Technology" },
    { value: "Computer Science / Software", label: "Computer Science / Software" },
    { value: "Data Science / AI / ML", label: "Data Science / AI / ML" },
    { value: "Electronics / Embedded Systems", label: "Electronics / Embedded Systems" },
    { value: "Mechanical / Manufacturing", label: "Mechanical / Manufacturing" },
    { value: "Civil / Construction", label: "Civil / Construction" },
    { value: "Finance / Banking", label: "Finance / Banking" },
    { value: "Marketing / Sales", label: "Marketing / Sales" },
    { value: "Healthcare / Biotech", label: "Healthcare / Biotech" },
    { value: "Education / Research", label: "Education / Research" },
    { value: "Consulting", label: "Consulting" },
    { value: "Government / Public Sector", label: "Government / Public Sector" },
    { value: "Entrepreneurship", label: "Entrepreneurship" },
    { value: "Others", label: "Others" },
  ];

  const handleDegreeChange = (selectedOption) => {
    setSelectedDegree(selectedOption);
    setFormData({ ...formData, degree: selectedOption.value });
  };

  const handleRoleChange = (selectedOption) => {
    setSelectedRole(selectedOption);
    setFormData({ ...formData, role: selectedOption.value });
  };

  const handleDomainChange = (selectedOption) => {
    setSelectedDomain(selectedOption);
    setFormData({ ...formData, domain: selectedOption.value });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    if (!formData.email) {
      toast.error("Please enter your email first");
      return;
    }
    setLoading(true);
    try {
      await api.post("/otp/send", { email: formData.email });
      toast.success("OTP sent to your email");
      setStep(2);
      setOtpTimer(60);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      await api.post("/otp/verify", { email: formData.email, otp: otpValue });
      toast.success("Email verified successfully");
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP verification failed");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.role) {
      toast.error("Please select a role.");
      setLoading(false);
      return;
    }

    if (isAlumniRole && !formData.degree) {
      toast.error("Please select a degree.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name: formData.firstName + " " + formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role || "alumni",
        firstName: formData.firstName,
        lastName: formData.lastName,
        startYear: formData.startYear,
        endYear: formData.endYear,
        degree: formData.degree,
        department: formData.department,
        rollNumber: formData.rollNumber,
        linkedinUrl: formData.linkedinUrl,
        designation: formData.designation,
        domain: formData.domain,
      };

      const response = await api.post("/register", payload);

      if (response.data.status === "success") {
        toast.success("Registration submitted for admin approval!");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    }

    setLoading(false);
  };

  const inputClass =
    "form-control";
  const isAlumniRole = !selectedRole || selectedRole.value === "alumni";

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "52px",
      borderRadius: "0.75rem",
      borderColor: state.isFocused ? "#6366f1" : "#cbd5e1",
      boxShadow: state.isFocused ? "0 0 0 4px #e0e7ff" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#6366f1" : "#94a3b8",
      },
    }),
  };

  return (
    <>
      <ToastContainer />
      <main className="relative px-4 py-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(79,70,229,0.12),transparent_28rem),radial-gradient(circle_at_90%_40%,rgba(20,184,166,0.1),transparent_28rem)]" />
        <section className="surface-card mx-auto max-w-4xl overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#101936] via-[#172554] to-[#3157d5] px-6 py-9 text-white sm:px-9">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border-[35px] border-white/5" />
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
                Alumni registration
              </p>
              <h1 className="text-3xl font-black tracking-tight">
                Create your account
              </h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                Join the CMRIT alumni portal and unlock access to alumni search,
                events, job opportunities, and college updates.
              </p>
              <div className="mt-4 flex items-center gap-3">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold ${
                        step >= s
                          ? "bg-teal-400 text-slate-950"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {s}
                    </div>
                    {s < 3 && (
                      <div
                        className={`h-0.5 w-8 ${
                          step > s ? "bg-teal-400" : "bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            {/* STEP 1: Email */}
            {step === 1 && (
              <section className="space-y-4">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Verify your email
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  Enter your email address and we will send you a verification code.
                </p>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Email *
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    onChange={handleChange}
                    placeholder="you@cmrit.ac.in"
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading || !formData.email}
                  className="primary-button disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? <Loader text="Sending" /> : "Send OTP"}
                </button>
              </section>
            )}

            {/* STEP 2: OTP */}
            {step === 2 && (
              <section className="space-y-4">
                <h2 className="text-lg font-extrabold text-slate-900">
                  Enter verification code
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  We sent a 6-digit code to <strong>{formData.email}</strong>
                </p>
                <OtpInput length={6} onChange={setOtpValue} />
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading || otpValue.length !== 6}
                    className="primary-button disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? <Loader text="Verifying" /> : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpTimer > 0}
                    className="text-sm font-bold text-indigo-700 hover:underline disabled:text-slate-400 disabled:no-underline"
                  >
                    {otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : "Resend OTP"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-bold text-slate-500 hover:text-slate-900"
                >
                  Change email
                </button>
              </section>
            )}

            {/* STEP 3: Full Form */}
            {step === 3 && (
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
                  ✓ Email verified: {formData.email}
                </div>

                <section>
                  <h2 className="mb-4 text-lg font-extrabold text-slate-900">
                    Personal details
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-600">
                        First name *
                      </span>
                      <input
                        name="firstName"
                        type="text"
                        required
                        onChange={handleChange}
                        placeholder="First Name"
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-600">
                        Last name *
                      </span>
                      <input
                        name="lastName"
                        type="text"
                        required
                        onChange={handleChange}
                        placeholder="Last Name"
                        className={inputClass}
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h2 className="mb-4 text-lg font-extrabold text-slate-900">
                    Account details
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-slate-600">
                        Password *
                      </span>
                      <input
                        name="password"
                        type="password"
                        required
                        onChange={handleChange}
                        placeholder="Create a password"
                        className={inputClass}
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm font-bold text-slate-600">
                        Role *
                      </span>
                      <Select
                        options={roleOptions}
                        value={selectedRole}
                        onChange={handleRoleChange}
                        placeholder="Select Role"
                        styles={selectStyles}
                      />
                    </label>
                  </div>
                </section>

                {isAlumniRole && (
                  <section>
                    <h2 className="mb-4 text-lg font-extrabold text-slate-900">
                      Academic details
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-600">
                          Start year *
                        </span>
                        <input
                          name="startYear"
                          type="text"
                          required={isAlumniRole}
                          onChange={handleChange}
                          placeholder="2020"
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-600">
                          End year *
                        </span>
                        <input
                          name="endYear"
                          type="text"
                          required={isAlumniRole}
                          onChange={handleChange}
                          placeholder="2024"
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-600">
                          Degree *
                        </span>
                        <Select
                          options={degreeOptions}
                          value={selectedDegree}
                          onChange={handleDegreeChange}
                          placeholder="Select Degree"
                          styles={selectStyles}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-600">
                          Department *
                        </span>
                        <select aria-label="Department" name="department" required={isAlumniRole} value={formData.department} onChange={handleChange} className={inputClass}>
                          <option value="">Select an active department</option>
                          {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
                        </select>
                        {!departments.length && <p className="text-sm text-amber-800">Department setup is required before registration.</p>}
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-600">
                          Roll number *
                        </span>
                        <input
                          name="rollNumber"
                          type="text"
                          required={isAlumniRole}
                          onChange={handleChange}
                          placeholder="USN / Roll Number"
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-600">
                          Current Designation *
                        </span>
                        <input
                          name="designation"
                          type="text"
                          required={isAlumniRole}
                          onChange={handleChange}
                          placeholder="Software Engineer"
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-600">
                          Domain *
                        </span>
                        <Select
                          options={domainOptions}
                          value={selectedDomain}
                          onChange={handleDomainChange}
                          placeholder="Select Domain"
                          styles={selectStyles}
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-sm font-bold text-slate-600">
                          LinkedIn profile URL *
                        </span>
                        <input
                          name="linkedinUrl"
                          type="url"
                          required={isAlumniRole}
                          onChange={handleChange}
                          placeholder="https://linkedin.com/in/yourprofile"
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </section>
                )}

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-500">
                    Already registered?{" "}
                    <Link to="/login" className="text-blue-700 hover:underline">
                      Sign in
                    </Link>
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="primary-button disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? <Loader text="Please Wait" /> : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default Register;
