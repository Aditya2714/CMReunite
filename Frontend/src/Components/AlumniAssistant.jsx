import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowRight, FaBrain, FaCheckCircle, FaSearch, FaUserPlus } from "react-icons/fa";
import api from "../services/api";

const examples = [
  "Find a Python mentor in Bengaluru",
  "Who works at Microsoft from the 2020 batch?",
  "Find referral contacts for frontend roles",
];

function AlumniAssistant() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const navigate = useNavigate();

  const ask = async (value = query) => {
    if (!value.trim()) return;
    setQuery(value);
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/assistant/query", { query: value });
      setResponse(data.data);
      setHistory((current) => [...current, { query: value, answer: data.data.answer }].slice(-5));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The assistant is unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const connect = async (person) => {
    try {
      const { data } = await api.post("/assistant/action", {
        action: "connect", targetProfileId: person._id, confirmed: false,
      });
      setPendingAction(data.data);
    } catch (connectionError) {
      setNotice(connectionError.response?.data?.message || "Unable to send request.");
    }
  };

  const confirmAction = async () => {
    try {
      const { data } = await api.post("/assistant/action", { ...pendingAction, confirmed: true });
      setNotice(data.data.message);
      setPendingAction(null);
    } catch (error) {
      setNotice(error.response?.data?.message || "Unable to complete action.");
    }
  };

  const openAction = async (action) => {
    const { data } = await api.post("/assistant/action", { action });
    navigate(data.data.navigation);
  };

  return (
    <main className="px-4 py-9">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] bg-[#101936] p-7 text-white shadow-2xl md:p-10">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-teal-300">
              <FaBrain /> Grounded alumni intelligence
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
              Ask the network in your own words.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
              Search by skill, company, batch, branch, city, mentorship, or referrals. Every result
              is traced to an alumni profile—no invented answers.
            </p>
            <form
              className="mt-7 flex flex-col gap-3 rounded-2xl bg-white p-2 md:flex-row"
              onSubmit={(event) => { event.preventDefault(); ask(); }}
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-12 flex-1 rounded-xl px-4 font-semibold text-slate-900 outline-none"
                placeholder="e.g. Find a data science mentor from the 2021 batch"
                aria-label="Ask the alumni assistant"
              />
              <button className="primary-button min-w-32" disabled={loading}>
                <FaSearch /> {loading ? "Searching…" : "Ask"}
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {examples.map((example) => (
                <button key={example} type="button" onClick={() => ask(example)}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/20">
                  {example}
                </button>
              ))}
            </div>
          </div>
        </header>

        {error && <p className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
        {notice && <p className="rounded-xl bg-teal-50 p-4 font-bold text-teal-800">{notice}</p>}
        {pendingAction && (
          <section role="alertdialog" aria-label="Confirm assistant action" className="surface-card flex flex-wrap items-center justify-between gap-4 border-amber-300 p-5">
            <p className="font-black text-slate-900">{pendingAction.message}</p>
            <div className="flex gap-2">
              <button onClick={confirmAction} className="primary-button">Confirm</button>
              <button onClick={() => setPendingAction(null)} className="secondary-button">Cancel</button>
            </div>
          </section>
        )}

        {response && (
          <>
            <section className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-slate-900">{response.answer}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">
                      Intent: {response.intent.mode}
                    </span>
                    {response.intent.keywords.map((keyword) => (
                      <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{keyword}</span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-teal-50 px-4 py-3 text-xs font-bold text-teal-800">
                  <FaCheckCircle className="mr-2 inline" /> {response.evidence.ranking}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {response.results.map((person) => (
                <article key={person._id} className="surface-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 font-black text-white">
                      {person.firstName?.[0]}{person.lastName?.[0]}
                    </div>
                    <div>
                      <h2 className="font-black text-slate-900">{person.firstName} {person.lastName}</h2>
                      <p className="text-sm font-semibold text-slate-500">{person.designation}{person.company ? ` · ${person.company}` : ""}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    {[person.branch, person.endYear, person.location].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-3 space-y-1">
                    {person.matches.map((match) => (
                      <p key={match} className="text-xs font-bold text-teal-700"><FaCheckCircle className="mr-2 inline" />{match}</p>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button onClick={() => connect(person)} className="primary-button min-h-10 px-3 text-xs"><FaUserPlus /> Connect</button>
                    <Link to={`/alumni-directory`} className="secondary-button min-h-10 px-3 text-xs">Profile <FaArrowRight /></Link>
                  </div>
                </article>
              ))}
            </section>
            <section className="surface-card flex flex-wrap items-center gap-3 p-5">
              <strong className="mr-auto text-slate-900">Continue with this result</strong>
              <button onClick={() => openAction("open_mentorship")} className="secondary-button min-h-10 text-xs">Request mentorship</button>
              <button onClick={() => openAction("open_referrals")} className="secondary-button min-h-10 text-xs">Open referrals</button>
              <button onClick={() => openAction("open_network")} className="secondary-button min-h-10 text-xs">Show network paths</button>
            </section>
          </>
        )}
        {!!history.length && (
          <aside className="surface-card p-5">
            <h2 className="font-black text-slate-900">Recent conversation</h2>
            <div className="mt-3 space-y-3">
              {history.map((item, index) => <div key={`${item.query}-${index}`} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-black text-indigo-700">You: {item.query}</p><p className="mt-1 text-sm font-semibold text-slate-600">Assistant: {item.answer}</p></div>)}
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}

export default AlumniAssistant;
