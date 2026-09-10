import { Link } from "react-router-dom";
import { FaBrain, FaCheckCircle, FaDatabase, FaNetworkWired, FaPlay, FaShieldAlt } from "react-icons/fa";

const milestones = [
  ["Secure foundation", "JWT sessions, role authorization, password hashing, approval workflow and audit-friendly APIs."],
  ["Engagement platform", "Profiles, events, jobs, messaging, mentorship, referrals, communities and notifications."],
  ["Intelligent discovery", "Grounded assistant, explainable hybrid recommendations and interactive graph analytics."],
  ["Trust and evidence", "Privacy enforcement, model benchmarks, live analytics and automated verification suites."],
];

function PresentationMode() {
  return (
    <main className="bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-6xl space-y-14">
        <header className="grid min-h-[70vh] place-items-center text-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-300">Final-year project presentation</p>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-7xl">CMReunite turns alumni records into an active career network.</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-slate-300">A secure, explainable and measurable platform for alumni discovery, mentoring, referrals, institutional engagement and intelligent recommendations.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/assistant" className="primary-button"><FaPlay /> Start live demo</Link>
              <Link to="/model-evaluation" className="secondary-button">View model evidence</Link>
            </div>
          </div>
        </header>

        <section>
          <p className="text-xs font-black uppercase tracking-wider text-teal-300">Problem and response</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl bg-red-950/40 p-7"><h2 className="text-2xl font-black">The gap</h2><p className="mt-3 font-semibold leading-7 text-slate-300">Alumni information is often static, fragmented and difficult to turn into mentorship, referral or institutional value.</p></article>
            <article className="rounded-3xl bg-teal-950/50 p-7"><h2 className="text-2xl font-black">Our approach</h2><p className="mt-3 font-semibold leading-7 text-slate-300">Connect verified profiles with workflows, graph relationships, grounded natural-language discovery and measurable outcomes.</p></article>
          </div>
        </section>

        <section>
          <p className="text-xs font-black uppercase tracking-wider text-teal-300">System architecture</p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              [FaNetworkWired, "React PWA", "Accessible responsive interface"],
              [FaShieldAlt, "Express API", "Authentication and business rules"],
              [FaDatabase, "MongoDB", "Profiles and engagement data"],
              [FaBrain, "Python ML", "Explainable hybrid ranking"],
            ].map(([Icon, title, note], index) => (
              <article key={title} className="relative rounded-2xl border border-white/10 bg-white/5 p-6">
                <Icon className="text-2xl text-indigo-300" /><h2 className="mt-4 font-black">{title}</h2><p className="mt-2 text-sm font-semibold text-slate-400">{note}</p>
                {index < 3 && <span className="absolute -right-4 top-1/2 hidden text-teal-300 md:block">→</span>}
              </article>
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs font-black uppercase tracking-wider text-teal-300">Implementation journey</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {milestones.map(([title, description], index) => (
              <article key={title} className="rounded-2xl bg-white/5 p-6"><span className="text-xs font-black text-indigo-300">0{index + 1}</span><h2 className="mt-2 text-xl font-black">{title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-slate-400">{description}</p></article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 text-slate-900">
          <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Evidence</p>
          <h2 className="mt-2 text-3xl font-black">Built to be demonstrated and defended.</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["Explainable recommendation signals", "Version-controlled evaluation fixtures", "Backend, integration, ML and browser tests", "Privacy enforced at API level", "Live MongoDB analytics", "Offline-capable installable PWA"].map((item) => (
              <p key={item} className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-sm font-bold"><FaCheckCircle className="mt-0.5 shrink-0 text-teal-600" />{item}</p>
            ))}
          </div>
        </section>

        <section className="pb-16 text-center">
          <h2 className="text-3xl font-black">Live demonstration sequence</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {[["Assistant", "/assistant"], ["Network graph", "/network-graph"], ["Mentorship", "/mentorship"], ["Referrals", "/career-referrals"], ["Analytics", "/reports"], ["Privacy", "/privacy"]].map(([label, to]) => <Link key={to} to={to} className="rounded-full border border-white/20 px-5 py-3 text-sm font-black hover:bg-white/10">{label}</Link>)}
          </div>
        </section>
      </section>
    </main>
  );
}

export default PresentationMode;
