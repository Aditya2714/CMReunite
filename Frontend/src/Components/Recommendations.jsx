import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  FaBrain,
  FaBuilding,
  FaCheck,
  FaEyeSlash,
  FaMapMarkerAlt,
  FaThumbsDown,
  FaThumbsUp,
  FaUserPlus,
} from "react-icons/fa";

const modes = [
  ["network", "Build my network"],
  ["mentor", "Find a mentor"],
  ["referral", "Find referral contacts"],
];

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [mode, setMode] = useState("network");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      setRecommendations([]);
      setMetadata({});
      try {
        const { data } = await api.post("/ml/recommendations", {
          topN: 12,
          algorithm: "combined",
          mode,
        });
        setRecommendations(data.data.recommendations || []);
        setMetadata(data.data);
      } catch (err) {
        console.error("Recommendation fetch failed:", err);
        setError("Recommendations are temporarily unavailable. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [mode, retry]);

  const submitFeedback = async (person, action) => {
    try {
      await api.post("/ml/feedback", {
        recommendedUserId: person.userId,
        mode,
        action,
        score: person.score,
        modelVersion: person.modelVersion,
      });
      if (["hidden", "not_relevant"].includes(action)) {
        setRecommendations((current) => current.filter((item) => item.id !== person.id));
      }
      setMessage("Your feedback was saved and will improve future ranking.");
    } catch (feedbackError) {
      setMessage(feedbackError.response?.data?.message || "Unable to save feedback.");
    }
  };

  const connect = async (person) => {
    try {
      await api.post(`/connections/${person.id}`);
      await submitFeedback(person, "connected");
      setMessage(`Connection request sent to ${person.firstName}.`);
    } catch (connectionError) {
      setMessage(connectionError.response?.data?.message || "Unable to send connection request.");
    }
  };

  return (
    <main className="px-4 py-9">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#101936] via-[#172554] to-[#3157d5] p-7 text-white shadow-2xl md:p-9">
          <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full border-[38px] border-white/5" />
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-teal-300 backdrop-blur">
              <FaBrain />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-200">
                Explainable hybrid matching
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Recommended for you</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
            Rankings combine skills, career domain, profile text, education, location,
            experience, and your previous feedback.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {modes.map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setMode(value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-extrabold transition ${
                  mode === value ? "bg-teal-400 text-slate-950 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {metadata.profileCompleteness !== undefined && (
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-extrabold text-slate-900">
                Profile completeness: {metadata.profileCompleteness}%
              </p>
              <span className="text-xs font-bold text-slate-500">
                Model: {metadata.modelVersion}
              </span>
            </div>
            {metadata.coldStart && (
              <p className="mt-2 text-sm font-semibold text-amber-700">
                These are cold-start results. Add skills, domain, bio, and company information
                to improve relevance.
              </p>
            )}
          </section>
        )}

        {message && <p className="rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p>}
        {loading && <p className="rounded-lg bg-white p-8 text-center font-bold">Finding the best matches…</p>}
        {error && <div role="alert" className="rounded-lg bg-red-50 p-6 text-center font-bold text-red-700"><p>{error}</p><button type="button" onClick={() => setRetry((current) => current + 1)} className="mt-3 rounded-lg border border-red-700 px-4 py-2">Try again</button></div>}

        {!loading && !error && !recommendations.length && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">No recommendations yet</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Complete your profile or change the recommendation purpose.
            </p>
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          {recommendations.map((person) => (
            <article key={person.id} className="surface-card p-5 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl">
              <div className="flex items-start gap-4">
                {person.imageUrl ? (
                  <img src={person.imageUrl} alt={`${person.firstName} ${person.lastName}`} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 font-extrabold text-white">
                    {person.firstName?.[0]}{person.lastName?.[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold text-slate-900">{person.firstName} {person.lastName}</h3>
                  {person.designation && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                      <FaBuilding className="text-indigo-600" /> {person.designation}{person.company ? ` at ${person.company}` : ""}
                    </p>
                  )}
                  {person.location && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                      <FaMapMarkerAlt className="text-indigo-600" /> {person.location}
                    </p>
                  )}
                </div>
                <strong className="rounded-full bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                  {person.compatibility}%
                </strong>
              </div>

              <div className="mt-4 space-y-2">
                {person.reasons?.map((reason) => (
                  <p key={`${reason.type}-${reason.label}`} className="flex items-start gap-2 text-sm font-semibold text-slate-600">
                    <FaCheck className="mt-1 shrink-0 text-teal-600" />
                    <span>{reason.label}{reason.matches?.length ? `: ${reason.matches.join(", ")}` : ""}</span>
                  </p>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {mode === "network" && (
                  <button type="button" onClick={() => connect(person)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white">
                    <FaUserPlus /> Connect
                  </button>
                )}
                {mode === "mentor" && (
                  <Link to="/mentorship" onClick={() => submitFeedback(person, "mentorship_requested")} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white">
                    Request mentorship
                  </Link>
                )}
                {mode === "referral" && (
                  <Link to="/career-referrals" className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white">
                    Request referral
                  </Link>
                )}
                <button type="button" aria-label="Relevant" onClick={() => submitFeedback(person, "relevant")} className="rounded-lg border border-slate-300 p-2 text-teal-700"><FaThumbsUp /></button>
                <button type="button" aria-label="Not relevant" onClick={() => submitFeedback(person, "not_relevant")} className="rounded-lg border border-slate-300 p-2 text-red-600"><FaThumbsDown /></button>
                <button type="button" aria-label="Hide recommendation" onClick={() => submitFeedback(person, "hidden")} className="rounded-lg border border-slate-300 p-2 text-slate-600"><FaEyeSlash /></button>
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

export default Recommendations;
