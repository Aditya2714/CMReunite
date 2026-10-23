import {
  FaAward,
  FaBookOpen,
  FaBriefcase,
  FaBullhorn,
  FaCalendarAlt,
  FaComments,
  FaDonate,
  FaHandsHelping,
  FaIdBadge,
  FaBrain,
  FaRobot,
  FaProjectDiagram,
  FaSearch,
  FaUpload,
  FaUserCheck,
  FaUserCircle,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { useEffect, useState } from "react";
import api from "../services/api";
import { Link, NavLink } from "react-router-dom";
import { useCurrentUser } from "../services/authService";
import logo from "../assets/img/logo.png";

const roleCopy = {
  alumni: {
    eyebrow: "Alumni workspace",
    title: "Reconnect, grow, and give back.",
    description:
      "Find classmates, request mentorship, explore referrals, join events, and stay connected with the CMRIT community.",
  },
  admin: {
    eyebrow: "Department Admin workspace",
    title: "Manage your department.",
    description:
      "Manage your department’s alumni, approvals, imports, announcements, events and reports.",
  },
  faculty: {
    eyebrow: "Faculty workspace",
    title: "Support students and alumni.",
    description:
      "Guide mentorship requests, share announcements, support events, and contribute academic resources.",
  },
  college: {
    eyebrow: "College workspace",
    title: "Coordinate alumni outreach.",
    description:
      "Manage official updates, bulk records, events, contributions, recognition, and institutional reports.",
  },
};

const navByRole = {
  alumni: [
    ["Dashboard", "/dashboard", FaIdBadge],
    ["Profile", "/profile", FaUserCircle],
    ["Alumni Directory", "/alumni-directory", FaSearch],
    ["Connections", "/connections", FaUserPlus],
    ["Mentorship", "/mentorship", FaHandsHelping],
    ["Career Referrals", "/career-referrals", FaBriefcase],
    ["Events", "/events", FaCalendarAlt],
    ["Community Posts", "/community-posts", FaBriefcase],
    ["Resources", "/resources", FaBookOpen],
    ["Recognition", "/recognition", FaAward],
    ["Recommended", "/recommendations", FaBrain],
    ["AI Alumni Assistant", "/assistant", FaRobot],
    ["Network Graph", "/network-graph", FaProjectDiagram],
  ],
  admin: [
    ["Dashboard", "/dashboard", FaIdBadge],
    ["Profile", "/profile", FaUserCircle],
    ["Manage Alumni", "/manage-alumni", FaSearch],
    ["Bulk Import", "/bulk-upload", FaUpload],
    ["Approvals", "/approvals", FaUserCheck],
    ["Mentorship Requests", "/admin-mentorship", FaHandsHelping],
    ["Announcements", "/announcements", FaBullhorn],
    ["Events", "/events", FaCalendarAlt],
    ["Community Posts", "/community-posts", FaBriefcase],
    ["Reports", "/reports", FaComments],
    ["Recognition", "/recognition", FaAward],
  ],
  faculty: [
    ["Dashboard", "/dashboard", FaIdBadge],
    ["Profile", "/profile", FaUserCircle],
    ["Alumni Directory", "/alumni-directory", FaSearch],
    ["Mentorship", "/mentorship", FaHandsHelping],
    ["Announcements", "/announcements", FaBullhorn],
    ["Events", "/events", FaCalendarAlt],
    ["Forum", "/forum", FaComments],
    ["Resources", "/resources", FaBookOpen],
  ],
  college: [
    ["Dashboard", "/dashboard", FaIdBadge],
    ["Profile", "/profile", FaUserCircle],
    ["Bulk Import", "/bulk-upload", FaUpload],
    ["Announcements", "/announcements", FaBullhorn],
    ["Events", "/events", FaCalendarAlt],
    ["Alumni Directory", "/alumni-directory", FaSearch],
    ["Contributions", "/contributions", FaDonate],
    ["Recognition", "/recognition", FaAward],
    ["Reports", "/reports", FaComments],
  ],
};

const statsByRole = {
  alumni: [
    ["Connections", "42", "people in your network"],
    ["Events", "3", "registered or suggested"],
    ["Referrals", "8", "active opportunities"],
  ],
  admin: [
    ["Alumni Records", "5k+", "registered profiles"],
    ["Pending Review", "34", "records and posts"],
    ["Imports", "12", "completed uploads"],
  ],
  faculty: [
    ["Mentorship", "16", "requests to review"],
    ["Announcements", "9", "sent this term"],
    ["Events", "5", "faculty-supported sessions"],
  ],
  college: [
    ["Departments", "9", "tracked in portal"],
    ["Outreach", "24", "announcements sent"],
    ["Contributions", "₹8.6L", "pledged support"],
  ],
};

const actionsByRole = {
  alumni: [
    ["Find Alumni", "Search by batch, branch, company, or role.", "/alumni-directory", FaSearch],
    ["Connections", "Send and manage connection requests.", "/connections", FaUserPlus],
    ["Career Referrals", "Browse roles shared by alumni.", "/career-referrals", FaBriefcase],
    ["Mentorship", "Ask for career or academic guidance.", "/mentorship", FaHandsHelping],
    ["Resources", "Access guides, templates, and prep docs.", "/resources", FaBookOpen],
    ["Recognition", "Celebrate alumni achievements.", "/recognition", FaAward],
    ["AI Alumni Assistant", "Find people using natural language.", "/assistant", FaRobot],
    ["Network Graph", "Explore connections and shared interests.", "/network-graph", FaProjectDiagram],
  ],
  admin: [
    ["Manage Alumni", "Edit alumni profiles and remove invalid records.", "/manage-alumni", FaSearch],
    ["Bulk Import", "Upload student and alumni records.", "/bulk-upload", FaUpload],
    ["Approvals", "Review alumni registrations before login access.", "/approvals", FaUserCheck],
    ["Mentorship Requests", "Review and update alumni mentorship requests.", "/admin-mentorship", FaHandsHelping],
    ["Announcements", "Publish targeted updates.", "/announcements", FaBullhorn],
    ["Reports", "Review live platform activity and engagement.", "/reports", FaComments],
  ],
  faculty: [
    ["Guide Mentorship", "Review mentorship requests.", "/mentorship", FaHandsHelping],
    ["Announcements", "Share updates with alumni groups.", "/announcements", FaBullhorn],
    ["Alumni Directory", "Find alumni by batch and branch.", "/alumni-directory", FaSearch],
    ["Resources", "Share academic and placement material.", "/resources", FaBookOpen],
    ["Forum", "Support community discussions.", "/forum", FaComments],
    ["Events", "Coordinate college sessions.", "/events", FaCalendarAlt],
  ],
  college: [
    ["Bulk Import", "Maintain alumni and student records.", "/bulk-upload", FaUpload],
    ["Campus Updates", "Create official announcements.", "/announcements", FaBullhorn],
    ["Events", "Coordinate alumni programs.", "/events", FaCalendarAlt],
    ["Alumni Directory", "View alumni across departments.", "/alumni-directory", FaSearch],
    ["Contributions", "Track alumni support.", "/contributions", FaDonate],
    ["Recognition", "Showcase alumni impact.", "/recognition", FaAward],
  ],
};

const panelsByRole = {
  alumni: {
    primaryTitle: "Upcoming events",
    primaryItems: [
      ["14 May", "Alumni Leadership Summit", "Campus meet for alumni mentors and student leaders."],
      ["28 May", "Career Night", "Tech and product panel with alumni speakers."],
    ],
    secondaryTitle: "Job highlights",
    secondaryItems: [
      ["FinEdge", "Backend Developer", "Referral-friendly Node.js role."],
      ["Nexora", "Data Analyst", "Early-career remote opportunity."],
    ],
  },
  admin: {
    primaryTitle: "Admin queue",
    primaryItems: [
      ["34 rows", "Verify imported records", "Review the latest student data upload."],
      ["6 posts", "Moderate job posts", "Check newly submitted opportunities."],
    ],
    secondaryTitle: "Platform activity",
    secondaryItems: [
      ["72", "New registrations", "Recently created accounts."],
      ["9", "Announcements sent", "Updates published this month."],
    ],
  },
  faculty: {
    primaryTitle: "Mentorship queue",
    primaryItems: [
      ["Pending", "Resume Review", "Final-year student requesting feedback."],
      ["New", "Higher Studies Guidance", "SOP and application timeline support."],
    ],
    secondaryTitle: "Discussion topics",
    secondaryItems: [
      ["18 replies", "Placement prep for 2026 batch", "Students and alumni discussing strategy."],
      ["11 replies", "Higher studies roadmap", "Faculty-led discussion."],
    ],
  },
  college: {
    primaryTitle: "Institutional updates",
    primaryItems: [
      ["Draft", "Annual alumni meet", "Prepare invitation for all batches."],
      ["Ready", "Scholarship update", "Share contribution campaign progress."],
    ],
    secondaryTitle: "Contribution highlights",
    secondaryItems: [
      ["₹4.2L", "Student Scholarship Fund", "Alumni support for scholarships."],
      ["₹2.8L", "Lab Equipment Support", "Campaign for academic infrastructure."],
    ],
  },
};

function Dashboard() {
  const user = useCurrentUser() || {};
  const {
    role,
    email,
    firstName,
    lastName,
    name,
    adminName,
    branch,
    degree,
    endYear,
    imageUrl,
    profileImage,
    avatar,
  } = user;

  const activeRole = role === "college" ? "alumni" : roleCopy[role] ? role : "alumni";
  const displayName =
    activeRole === "admin"
      ? adminName || name || "Admin User"
      : [firstName, lastName].filter(Boolean).join(" ") ||
        name ||
        (activeRole === "college" ? "CMRIT Office" : "CMRIT member");
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const photoUrl = imageUrl || profileImage || avatar || user.image || user.photoUrl;
  const copy = roleCopy[activeRole];
  const sidebarLinks = navByRole[activeRole];
  const [adminOverview, setAdminOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const stats =
    activeRole === "admin" && adminOverview
      ? [
          ["Alumni Records", adminOverview.alumni, "registered alumni profiles"],
          ["Pending Review", adminOverview.pendingAlumni, "accounts awaiting approval"],
          ["Events & Jobs", adminOverview.events + adminOverview.jobs, "active platform listings"],
        ]
      : activity
        ? [
            ["Connections", activity.connections, "accepted network relationships"],
            ["Events", activity.events, "registered or attended"],
            ["Active requests", activity.referrals + activity.mentorships, "referrals and mentorships"],
          ]
        : statsByRole[activeRole];
  const quickActions = actionsByRole[activeRole];
  const panels = panelsByRole[activeRole];

  useEffect(() => {
    const fetchAdminOverview = async () => {
      if (activeRole !== "admin") return;

      try {
        const response = await api.get("/admin/overview");
        setAdminOverview(response.data.data.overview);
      } catch (error) {
        console.error("Admin overview fetch failed:", error);
      }
    };

    fetchAdminOverview();
  }, [activeRole]);

  useEffect(() => {
    if (activeRole === "admin") return;
    api.get("/profile/activity-summary")
      .then((response) => setActivity(response.data.data))
      .catch((error) => console.error("Activity summary fetch failed:", error));
  }, [activeRole]);

  const profileDetails =
    activeRole === "admin"
      ? [
          ["Role", "Department administrator"],
          ["Email", email || "Not added"],
          ["Focus", "Records and moderation"],
        ]
      : activeRole === "college"
      ? [
          ["Role", "College office"],
          ["Email", email || "Not added"],
          ["Focus", "Institutional outreach"],
        ]
      : [
          ["Branch", branch || "Not added"],
          ["Degree", degree || "Not added"],
          ["Batch", endYear || "Not added"],
        ];

  return (
    <main className="px-4 py-7 sm:py-9">
      <section className="mx-auto grid max-w-[1400px] gap-7 lg:grid-cols-[270px_1fr]">
        <aside className="surface-card h-fit p-4 lg:sticky lg:top-24">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
              <img
                src={logo}
                alt="CMRunite Logo"
                className="h-11 w-11 rounded object-cover"
              />
            <div>
              <p className="font-extrabold text-slate-900">Workspace</p>
              <p className="text-xs font-bold capitalize text-slate-500">{activeRole}</p>
            </div>
          </div>

          <nav className="grid gap-1">
            {sidebarLinks.map(([label, to, Icon]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-extrabold transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                      : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <section
            className={`relative isolate grid gap-5 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#101936] via-[#172554] to-[#3157d5] p-7 text-white shadow-[0_24px_60px_-25px_rgba(30,41,119,0.7)] md:p-9 ${
              activeRole === "admin" ? "" : "md:grid-cols-[1fr_320px]"
            }`}
          >
            <div className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full border-[45px] border-white/5" />
            <div>
              <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
                {copy.eyebrow}
              </p>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Welcome back, {displayName}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
                {copy.description}
              </p>
            </div>

            {activeRole !== "admin" && (
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center gap-4">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={`${displayName} profile`}
                      className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20"
                    />
                  ) : (
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-lg font-extrabold text-slate-950">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-extrabold">{displayName}</p>
                    <p className="text-sm font-semibold capitalize text-slate-300">{activeRole}</p>
                    <p className="truncate text-xs font-semibold text-slate-400">{email}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-300">
                  {profileDetails.map(([label, value]) => (
                    <p key={label}>
                      {label}: {value}
                    </p>
                  ))}
                </div>
                <Link
                  to="/profile"
                  className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-extrabold text-indigo-900 transition hover:bg-teal-100"
                >
                  Edit Profile
                </Link>
              </div>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            {stats.map(([label, value, note]) => (
              <article key={label} className="surface-card relative overflow-hidden p-5">
                <span className="absolute right-0 top-0 h-20 w-20 translate-x-7 -translate-y-7 rounded-full bg-indigo-50" />
                <p className="relative text-sm font-bold text-slate-500">{label}</p>
                <strong className="relative mt-2 block text-3xl font-black text-slate-950">{value}</strong>
                <span className="mt-1 block text-sm font-semibold text-slate-500">{note}</span>
              </article>
            ))}
          </div>

          <section className="surface-card p-5 md:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Quick actions</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Start from here</h2>
              </div>
              <FaUsers className="hidden text-3xl text-blue-700 sm:block" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {quickActions.map(([title, description, to, Icon]) => (
                <Link
                  key={title}
                  to={to}
                  className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-1 hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-lg"
                >
                  <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                    <Icon />
                  </div>
                  <h3 className="font-extrabold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
                </Link>
              ))}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardPanel title={panels.primaryTitle} items={panels.primaryItems} />
            <DashboardPanel title={panels.secondaryTitle} items={panels.secondaryItems} />
          </div>
        </div>
      </section>
    </main>
  );
}

function DashboardPanel({ title, items }) {
  return (
    <section className="surface-card p-5 md:p-7">
      <p className="eyebrow">Overview</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-4">
        {items.map(([tag, itemTitle, detail]) => (
          <article key={itemTitle} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-indigo-200 hover:bg-white">
            <span className="mb-3 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700">
              {tag}
            </span>
            <h3 className="font-extrabold text-slate-900">{itemTitle}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Dashboard;
