import { useEffect, useState } from "react";
import { FaChartBar, FaCheckCircle, FaFlask } from "react-icons/fa";
import api from "../services/api";

const labels = { precision: "Precision@1", recall: "Recall@1", mrr: "MRR", ndcg: "NDCG@1" };

function ModelEvaluation() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/ml/evaluation")
      .then(({ data }) => setReport(data.data))
      .catch(() => setError("Unable to load the benchmark report."));
  }, []);

  return (
    <main className="px-4 py-9">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[2rem] bg-[#101936] p-7 text-white md:p-10">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-teal-300"><FaFlask /> Reproducible ML evaluation</p>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">Recommendation evidence, not guesswork.</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
            The same labelled alumni scenarios are ranked by two baselines and the adaptive hybrid model,
            then measured with standard information-retrieval metrics.
          </p>
        </header>
        {error && <p className="rounded-xl bg-red-50 p-5 font-bold text-red-700">{error}</p>}
        {!report && !error && <div className="surface-card p-10 text-center font-bold">Loading evaluation…</div>}
        {report && (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {report.models.map((model) => (
                <article key={model.algorithm} className={`surface-card p-6 ${model.algorithm === "hybrid-adaptive" ? "ring-2 ring-indigo-500" : ""}`}>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-600">{model.algorithm.replaceAll("-", " ")}</p>
                  <p className="mt-2 text-4xl font-black text-slate-900">{Math.round(model.ndcg * 100)}%</p>
                  <p className="text-sm font-bold text-slate-500">NDCG at rank 1</p>
                  <div className="mt-5 space-y-3">
                    {Object.entries(labels).map(([key, label]) => (
                      <div key={key}>
                        <div className="flex justify-between text-xs font-bold text-slate-600"><span>{label}</span><span>{Math.round(model[key] * 100)}%</span></div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-teal-400" style={{ width: `${model[key] * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
            <section className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
              <article className="surface-card p-6">
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><FaChartBar className="text-indigo-600" /> How it is tested</h2>
                <div className="mt-4 space-y-3">
                  {report.methodology.map((item) => <p key={item} className="flex gap-3 text-sm font-semibold text-slate-600"><FaCheckCircle className="mt-1 shrink-0 text-teal-600" />{item}</p>)}
                </div>
              </article>
              <article className="rounded-2xl bg-teal-50 p-6">
                <p className="text-xs font-black uppercase tracking-wider text-teal-700">Current result</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{report.winner.replaceAll("-", " ")}</h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">Top result on {report.models[0].fixtures} labelled mentor scenarios at K={report.k}. The fixture set is intentionally small and should grow with real feedback.</p>
                <p className="mt-4 text-xs font-bold text-slate-500">Evaluated {report.evaluatedAt}</p>
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

export default ModelEvaluation;
