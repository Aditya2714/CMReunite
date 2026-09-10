import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  FaAward,
  FaBriefcase,
  FaBullhorn,
  FaCalendarAlt,
  FaChartBar,
  FaClock,
  FaDatabase,
  FaLayerGroup,
  FaSyncAlt,
  FaUserCheck,
  FaUsers,
  FaDownload,
  FaComments,
  FaHandsHelping,
} from "react-icons/fa";

function AdminReports() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/overview");
      setOverview(response.data.data.overview);
    } catch (error) {
      console.error("Reports fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const exportReport = async () => {
    const response = await api.get("/admin/reports/export", { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cmreunite-engagement-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const metrics = useMemo(() => {
    const data = overview || {
      users: 0,
      alumni: 0,
      admins: 0,
      events: 0,
      jobs: 0,
      announcements: 0,
      recognitions: 0,
      pendingAlumni: 0,
    };

    return [
      ["Total Users", data.users, "all registered accounts", FaUsers],
      ["Alumni Profiles", data.alumni, "profiles in directory", FaUserCheck],
      ["Pending Approvals", data.pendingAlumni, "self-registrations waiting", FaClock],
      ["Events", data.events, "admin-created events", FaCalendarAlt],
      ["Jobs", data.jobs, "admin-posted opportunities", FaBriefcase],
      ["Announcements", data.announcements, "published platform updates", FaBullhorn],
      ["Recognitions", data.recognitions, "alumni achievements highlighted", FaAward],
      ["Admin Accounts", data.admins, "platform managers", FaDatabase],
    ];
  }, [overview]);

  const maxValue = Math.max(...metrics.map((metric) => Number(metric[1]) || 0), 1);
  const approvalStats = [
    ["Approved alumni", overview?.approvedAlumniUsers || 0, "bg-emerald-500"],
    ["Pending review", overview?.pendingAlumni || 0, "bg-amber-500"],
    ["Rejected", overview?.rejectedAlumniUsers || 0, "bg-red-500"],
  ];
  const approvalTotal = Math.max(
    approvalStats.reduce((total, item) => total + Number(item[1] || 0), 0),
    1
  );
  const breakdowns = overview?.breakdowns || {};
  const computerScienceBranches = (breakdowns.alumniByBranch || []).filter((item) => {
    const label = String(item.label || "").toLowerCase();
    return (
      label.includes("computer science") ||
      label === "cse" ||
      label.includes("cse")
    );
  });
  const platformChartData = metrics
    .filter(([label]) =>
      ["Alumni Profiles", "Events", "Jobs", "Announcements", "Recognitions"].includes(label)
    )
    .map(([label, value]) => ({ label, count: Number(value) || 0 }));
  const engagement = overview?.engagement || {};

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
            Admin reports
          </p>
          <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
            Track platform activity and alumni engagement.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            Review live counts from MongoDB for users, alumni profiles,
            approvals, events, jobs, and admin activity.
          </p>
          {loading && (
            <p className="mt-3 text-sm font-semibold text-teal-100">
              Loading reports from database...
            </p>
          )}
          <button
            type="button"
            onClick={fetchReports}
            className="mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-white px-4 text-sm font-extrabold text-slate-950 transition hover:bg-teal-100"
          >
            <FaSyncAlt /> Refresh Reports
          </button>
          <button
            type="button"
            onClick={exportReport}
            className="ml-3 mt-5 inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-white/30 px-4 text-sm font-extrabold text-white transition hover:bg-white/10"
          >
            <FaDownload /> Export CSV
          </button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {metrics.map(([label, value, note, Icon]) => (
            <article
              key={label}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-500">{label}</p>
                  <strong className="mt-2 block text-3xl font-extrabold text-slate-900">
                    {value}
                  </strong>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon />
                </div>
              </div>
              <span className="mt-2 block text-sm font-semibold text-slate-500">
                {note}
              </span>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Accepted connections", engagement.acceptedConnections || 0, "network relationships", FaUsers],
            ["Mentorship completion", `${engagement.mentorshipCompletionRate || 0}%`, `${engagement.completedMentorships || 0} of ${engagement.mentorships || 0}`, FaHandsHelping],
            ["Referral success", `${engagement.referralSuccessRate || 0}%`, `${engagement.successfulReferrals || 0} successful outcomes`, FaBriefcase],
            ["Direct messages", engagement.messages || 0, "messages exchanged", FaComments],
          ].map(([label, value, note, Icon]) => (
            <article key={label} className="rounded-2xl bg-slate-950 p-5 text-white">
              <Icon className="text-xl text-teal-300" />
              <strong className="mt-4 block text-3xl font-black">{value}</strong>
              <p className="mt-1 text-sm font-extrabold">{label}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <FaUserCheck />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
                  Approval status
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Alumni verification
                </h2>
              </div>
            </div>

            <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
              {approvalStats.map(([label, value, color]) => (
                <div
                  key={label}
                  className={color}
                  style={{ width: `${(Number(value) / approvalTotal) * 100}%` }}
                  title={`${label}: ${value}`}
                />
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {approvalStats.map(([label, value, color]) => (
                <div key={label} className="flex items-center justify-between text-sm font-bold text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${color}`} />
                    {label}
                  </span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <FaLayerGroup />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
                  Alumni records
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Alumni distribution
                </h2>
              </div>
            </div>
            <p className="mb-5 text-sm font-semibold leading-6 text-slate-500">
              This shows how many alumni records are available in Computer
              Science and Engineering and in each passing batch.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              <BreakdownList title="Computer Science and Engineering" items={computerScienceBranches} />
              <BreakdownList title="Alumni by passing year" items={breakdowns.alumniByBatch || []} />
            </div>
          </article>
        </section>

        <section>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <FaChartBar />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
                  Activity summary
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Module-wise data
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              {metrics.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-700"
                      style={{
                        width: `${Math.max((Number(value) / maxValue) * 100, Number(value) ? 8 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <BreakdownCard title="Events by type" items={breakdowns.eventsByType || []} icon={FaCalendarAlt} />
          <BreakdownCard title="Jobs by status" items={breakdowns.jobsByStatus || []} icon={FaBriefcase} />
          <BreakdownCard title="Announcements by audience" items={breakdowns.announcementsByAudience || []} icon={FaBullhorn} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <BarChart
            title="Alumni by passing year"
            eyebrow="Batch visualization"
            items={breakdowns.alumniByBatch || []}
          />
          <BarChart
            title="Platform activity chart"
            eyebrow="Module visualization"
            items={platformChartData}
          />
          <BarChart
            title="New registrations"
            eyebrow="Six-month growth"
            items={breakdowns.registrationGrowth || []}
          />
          <BarChart
            title="Event conversion"
            eyebrow="Attendance"
            items={[
              { label: "Registered", count: engagement.eventRegistrations || 0 },
              { label: "Attended", count: engagement.attendedEvents || 0 },
            ]}
          />
        </section>
      </section>
    </main>
  );
}

function BreakdownList({ title, items }) {
  const max = Math.max(...items.map((item) => Number(item.count) || 0), 1);

  return (
    <div>
      {title && <h3 className="mb-3 font-extrabold text-slate-900">{title}</h3>}
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex justify-between text-sm font-bold text-slate-600">
                <span>{item.label}</span>
                <span>{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-700"
                  style={{ width: `${Math.max((Number(item.count) / max) * 100, 8)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold text-slate-500">No data available yet.</p>
      )}
    </div>
  );
}

function BreakdownCard({ title, items, icon: Icon }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
          <Icon />
        </div>
        <h2 className="font-extrabold text-slate-900">{title}</h2>
      </div>
      <BreakdownList title="" items={items} />
    </article>
  );
}

function BarChart({ title, eyebrow, items }) {
  const max = Math.max(...items.map((item) => Number(item.count) || 0), 1);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{title}</h2>
      {items.length ? (
        <div className="mt-6 flex min-h-[260px] items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">{item.count}</span>
              <div className="flex h-44 w-full items-end justify-center">
                <div
                  className="w-full max-w-[54px] rounded-t-lg bg-blue-700 transition"
                  style={{
                    height: `${Math.max((Number(item.count) / max) * 100, Number(item.count) ? 8 : 0)}%`,
                  }}
                />
              </div>
              <span className="w-full truncate text-center text-xs font-bold text-slate-500">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm font-semibold text-slate-500">No chart data available yet.</p>
      )}
    </article>
  );
}

export default AdminReports;
