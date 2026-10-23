import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaCheckCircle,
  FaEnvelope,
  FaGraduationCap,
  FaIdCard,
  FaTimesCircle,
  FaSyncAlt,
  FaUserCheck,
} from "react-icons/fa";

function AdminApprovals() {
  const [pendingAlumni, setPendingAlumni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [verificationNotes, setVerificationNotes] = useState({});
  const [reasons, setReasons] = useState([]);
  const [rejections, setRejections] = useState({});
  const [rejectingIds, setRejectingIds] = useState({});
  const [busyIds, setBusyIds] = useState({});
  const [errors, setErrors] = useState({});
  const updateRejection = (id, field, value) => {
    setRejections((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    setErrors((current) => ({ ...current, [id]: "" }));
  };

  const fetchPendingAlumni = async () => {
    setLoading(true);
    setMessage("");

    try {
      const [response, reasonResponse] = await Promise.all([
        api.get("/admin/pending-alumni"), api.get("/admin/rejection-reasons"),
      ]);
      setReasons(reasonResponse.data.data.reasons);
      setPendingAlumni(response.data.data.alumni);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load pending approvals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAlumni();
  }, []);

  const handleApprove = async (userId) => {
    setMessage("");
    setBusyIds((current) => ({ ...current, [userId]: true }));

    try {
      await api.patch(`/admin/users/${userId}/approval`, {
        isApproved: true,
        verificationNote: verificationNotes[userId] || "",
      });
      setPendingAlumni((current) =>
        current.filter((alumni) => alumni._id !== userId)
      );
      setMessage("Alumni account approved successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to approve alumni.");
    } finally {
      setBusyIds((current) => ({ ...current, [userId]: false }));
    }
  };

  const handleReject = async (userId) => {
    setMessage("");
    const { reason = "", comments = "" } = rejections[userId] || {};
    if (!reasons.some((item) => item.value === reason)) {
      setErrors((current) => ({ ...current, [userId]: "Select a rejection reason." }));
      return;
    }
    if (reason === "other" && !comments.trim()) {
      setErrors((current) => ({ ...current, [userId]: "Add comments when selecting Other." }));
      return;
    }
    setBusyIds((current) => ({ ...current, [userId]: true }));

    try {
      await api.patch(`/admin/users/${userId}/approval`, {
        isApproved: false,
        approvalStatus: "rejected",
        rejectionReason: reason,
        rejectionComments: comments.trim(),
      });
      setPendingAlumni((current) =>
        current.filter((alumni) => alumni._id !== userId)
      );
      setMessage("Alumni registration rejected.");
    } catch (error) {
      setErrors((current) => ({ ...current, [userId]: error.response?.data?.message || "Unable to reject alumni." }));
    } finally {
      setBusyIds((current) => ({ ...current, [userId]: false }));
    }
  };

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
            Admin approvals
          </p>
          <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
            Verify alumni before they enter the network.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            Review self-registered alumni using email, USN, branch, degree, and
            batch details. Approved users can login after verification.
          </p>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-500">Pending alumni</p>
              <strong className="mt-1 block text-3xl font-extrabold text-slate-900">
                {pendingAlumni.length}
              </strong>
            </div>
            <button
              type="button"
              onClick={fetchPendingAlumni}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-300 px-4 font-extrabold text-slate-900 transition hover:border-slate-900"
            >
              <FaSyncAlt /> Refresh
            </button>
          </div>

          {message && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
              {message}
            </div>
          )}
        </section>

        {loading ? (
          <section className="rounded-lg border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            Loading pending approvals...
          </section>
        ) : pendingAlumni.length ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {pendingAlumni.map((item) => {
              const profile = item.profile || {};
              const displayName =
                [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
                item.name ||
                item.email;

              return (
                <article
                  key={item._id}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">
                        {displayName}
                      </h2>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                        <FaEnvelope className="text-blue-700" /> {item.email}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
                      Pending
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-500 sm:grid-cols-2">
                    <p className="flex items-center gap-2">
                      <FaIdCard className="text-blue-700" />
                      USN: {profile.rollNumber || "Not added"}
                    </p>
                    <p className="flex items-center gap-2">
                      <FaGraduationCap className="text-blue-700" />
                      Batch: {profile.endYear || "Not added"}
                    </p>
                    <p>Branch: {profile.branch || "Not added"}</p>
                    <p>Degree: {profile.degree || "Not added"}</p>
                  </div>
                  {!rejectingIds[item._id] && <textarea
                    aria-label={`Verification note for ${displayName}`}
                    maxLength={2000}
                    rows="3"
                    value={verificationNotes[item._id] || ""}
                    onChange={(event) =>
                      setVerificationNotes((current) => ({
                        ...current,
                        [item._id]: event.target.value,
                      }))
                    }
                    placeholder="Optional verification note for approval"
                    className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-700"
                  />}

                  {rejectingIds[item._id] && (
                    <div className="mt-4 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
                      <label className="block text-sm font-bold text-slate-700">
                        Rejection reason
                        <select
                          aria-required="true"
                          value={rejections[item._id]?.reason || ""}
                          onChange={(event) => updateRejection(item._id, "reason", event.target.value)}
                          disabled={busyIds[item._id]}
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3"
                        >
                          <option value="">Select a reason</option>
                          {reasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                        </select>
                      </label>
                      <label className="block text-sm font-bold text-slate-700">
                        Additional comments {rejections[item._id]?.reason === "other" ? "(required)" : "(optional)"}
                        <textarea
                          rows="3"
                          aria-required={rejections[item._id]?.reason === "other"}
                          maxLength={2000}
                          value={rejections[item._id]?.comments || ""}
                          onChange={(event) => updateRejection(item._id, "comments", event.target.value)}
                          disabled={busyIds[item._id]}
                          placeholder="Explain what the alumnus needs to correct."
                          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3"
                        />
                      </label>
                      <p className="text-xs text-slate-600">Up to 2000 characters. The reason and comments will be shared with the alumnus.</p>
                      {errors[item._id] && <p role="alert" className="text-sm font-bold text-red-700">{errors[item._id]}</p>}
                      <div className="flex flex-wrap gap-3">
                        <button type="button" disabled={busyIds[item._id]} onClick={() => handleReject(item._id)} className="rounded-lg bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50">
                          {busyIds[item._id] ? "Saving..." : "Confirm rejection"}
                        </button>
                        <button type="button" disabled={busyIds[item._id]} onClick={() => {
                          setRejectingIds((current) => ({ ...current, [item._id]: false }));
                          setRejections((current) => ({ ...current, [item._id]: { reason: "", comments: "" } }));
                          setErrors((current) => ({ ...current, [item._id]: "" }));
                        }} className="rounded-lg border border-slate-300 px-4 py-3 font-bold">Cancel</button>
                      </div>
                    </div>
                  )}

                  {!rejectingIds[item._id] && <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={busyIds[item._id] || rejectingIds[item._id]}
                      onClick={() => handleApprove(item._id)}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
                    >
                      <FaCheckCircle /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyIds[item._id] || rejectingIds[item._id] || !reasons.length}
                      onClick={() => setRejectingIds((current) => ({ ...current, [item._id]: true }))}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 font-extrabold text-red-700 transition hover:bg-red-100"
                    >
                      <FaTimesCircle /> Reject
                    </button>
                  </div>}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-700">
              <FaUserCheck />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-slate-900">
              No pending approvals
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              New self-registered alumni will appear here for admin verification.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

export default AdminApprovals;
