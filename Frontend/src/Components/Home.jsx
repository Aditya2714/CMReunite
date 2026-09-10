import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaBriefcase,
  FaCalendarCheck,
  FaHandsHelping,
  FaNetworkWired,
} from "react-icons/fa";
import campusImage from "../assets/img/cmrit-campus-hero.jpg";

const features = [
  [FaNetworkWired, "Build your network", "Reconnect with classmates and discover alumni across batches, branches, and companies."],
  [FaHandsHelping, "Find the right mentor", "Get explainable mentor matches and manage every session from request to feedback."],
  [FaBriefcase, "Move your career forward", "Explore alumni-shared opportunities, referrals, practical resources, and career guidance."],
  [FaCalendarCheck, "Stay part of campus", "Join reunions, professional sessions, and community events with simple registration."],
];

function Home() {
  const [subEmail, setSubEmail] = useState("");
  const handleSubscribe = (event) => {
    event.preventDefault();
    if (subEmail) {
      alert(`Subscribed with: ${subEmail}`);
      setSubEmail("");
    }
  };

  return (
    <main className="overflow-hidden bg-[#f6f7fb]">
      <section
        className="relative isolate min-h-[calc(100vh-76px)] overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${campusImage})` }}
        aria-label="CMR Institute of Technology campus"
      >
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080d21]/90 via-[#101936]/58 to-transparent" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080d21]/80 via-transparent to-[#080d21]/10" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />

        <div className="app-container flex min-h-[calc(100vh-76px)] items-center py-16">
          <div className="max-w-2xl">
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.24em] text-teal-300">
              <span className="h-px w-10 bg-teal-300" />
              CMRIT Alumni Community
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Once CMRIT.
              <span className="mt-1 block font-medium text-white/75">
                Always connected.
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-base font-medium leading-7 text-slate-200 sm:text-lg">
              A trusted space for alumni to reconnect, exchange opportunities,
              and continue growing together beyond campus.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex min-h-[50px] items-center justify-center gap-3 rounded-full bg-white px-7 font-extrabold text-slate-950 shadow-xl transition hover:-translate-y-0.5 hover:bg-teal-100"
              >
                Join the alumni network <FaArrowRight />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-white/35 bg-black/10 px-7 font-extrabold text-white backdrop-blur transition hover:bg-white/15"
              >
                Member sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-7 right-8 hidden text-right text-white lg:block">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/60">
            CMR Institute of Technology
          </p>
          <p className="mt-1 text-sm font-semibold text-white/85">
            Whitefield, Bengaluru
          </p>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-20">
        <div className="app-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">One network, real outcomes</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Built for more than staying in touch.
            </h2>
            <p className="mt-4 font-semibold leading-7 text-slate-500">
              Turn alumni relationships into mentorship, opportunity, knowledge, and measurable institutional impact.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map(([Icon, title, copy]) => (
              <article key={title} className="surface-card group p-6 transition hover:-translate-y-1 hover:border-indigo-200">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-xl text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <Icon />
                </span>
                <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="app-container py-20">
        <div className="overflow-hidden rounded-[2rem] bg-[#101936] px-6 py-10 text-white shadow-2xl sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14">
          <div className="max-w-xl">
            <p className="eyebrow text-teal-300">Stay in the loop</p>
            <h2 className="mt-3 text-3xl font-black">Campus stories, events, and opportunities.</h2>
            <p className="mt-3 font-semibold leading-7 text-slate-300">
              Get a concise alumni update delivered to your inbox.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="mt-7 flex w-full max-w-lg gap-2 lg:mt-0">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="you@example.com"
              value={subEmail}
              onChange={(event) => setSubEmail(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-4 py-3.5 font-semibold text-white outline-none placeholder:text-slate-400 focus:border-teal-400"
            />
            <button type="submit" className="rounded-xl bg-teal-500 px-5 font-extrabold text-slate-950 transition hover:bg-teal-400">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Home;
