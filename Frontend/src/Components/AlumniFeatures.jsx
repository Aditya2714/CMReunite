import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaAward,
  FaBookOpen,
  FaBriefcase,
  FaComments,
  FaDonate,
  FaEdit,
  FaHeart,
  FaPaperPlane,
  FaPlus,
  FaTimes,
  FaTrash,
  FaUserCheck,
  FaUserPlus,
  FaBan,
} from "react-icons/fa";
import { useCurrentUser } from "../services/authService";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
      <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
        {description}
      </p>
    </div>
  );
}

function FeatureShell({ children }) {
  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6">{children}</section>
    </main>
  );
}

export function Connections() {
  const [connections, setConnections] = useState({
    incoming: [],
    outgoing: [],
    accepted: [],
    suggestions: [],
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchConnections = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.get("/connections");
      setConnections(response.data.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load connections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const sendRequest = async (alumniId) => {
    setMessage("");

    try {
      await api.post(`/connections/${alumniId}`);
      setMessage("Connection request sent successfully.");
      fetchConnections();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to send request.");
    }
  };

  const updateRequest = async (connectionId, status) => {
    setMessage("");

    try {
      await api.patch(`/connections/${connectionId}`, { status });
      setMessage(`Connection request ${status}.`);
      fetchConnections();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update request.");
    }
  };

  const blockUser = async (userId) => {
    try {
      await api.post(`/profile/blocked/${userId}`);
      setMessage("User blocked. They can no longer discover or contact you.");
      fetchConnections();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to block user.");
    }
  };

  return (
    <FeatureShell>
      <PageHeader
        eyebrow="Connections"
        title="Build your CMRIT alumni circle."
        description="Send, accept, and manage connection requests inside the alumni community."
      />

      {loading && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
          Loading connections from database...
        </section>
      )}

      {message && (
        <section className="rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
          {message}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <ConnectionStat title="Accepted" value={connections.accepted.length} />
        <ConnectionStat title="Incoming" value={connections.incoming.length} />
        <ConnectionStat title="Sent" value={connections.outgoing.length} />
      </section>

      <ConnectionSection
        title="Incoming requests"
        emptyText="No incoming connection requests yet."
        items={connections.incoming}
        renderActions={(person) => (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateRequest(person.connectionId, "accepted")}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
            >
              <FaUserCheck /> Accept
            </button>
            <button
              type="button"
              onClick={() => updateRequest(person.connectionId, "rejected")}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 font-extrabold text-red-700 transition hover:bg-red-100"
            >
              <FaTimes /> Reject
            </button>
          </div>
        )}
      />

      <ConnectionSection
        title="Suggested alumni"
        emptyText="No new alumni suggestions available."
        items={connections.suggestions}
        renderActions={(person) => (
          <button
            type="button"
            onClick={() => sendRequest(person.id)}
            className="mt-5 inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
          >
            <FaUserPlus /> Connect
          </button>
        )}
      />

      <ConnectionSection
        title="Accepted connections"
        emptyText="Accepted alumni connections will appear here."
        items={connections.accepted}
        renderActions={(person) => (
          <button type="button" onClick={() => blockUser(person.userId)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-extrabold text-red-700">
            <FaBan /> Block
          </button>
        )}
      />

      <ConnectionSection
        title="Sent requests"
        emptyText="Sent connection requests will appear here."
        items={connections.outgoing}
      />
    </FeatureShell>
  );
}

function ConnectionStat({ title, value }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <strong className="mt-2 block text-3xl font-extrabold text-slate-900">
        {value}
      </strong>
    </article>
  );
}

function ConnectionSection({ title, emptyText, items, renderActions }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
      {items.length ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {items.map((person) => (
            <ConnectionCard key={`${title}-${person.id}`} person={person}>
              {renderActions?.(person)}
            </ConnectionCard>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function ConnectionCard({ person, children }) {
  const initials = person.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="rounded-lg border border-slate-200 p-5">
      <div className="mb-4 grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-slate-950 font-extrabold text-white">
        {person.imageUrl && person.fileType !== "application/pdf" ? (
          <img
            src={person.imageUrl}
            alt={`${person.name} profile`}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <h3 className="font-extrabold text-slate-900">{person.name}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        Batch {person.batch} · {person.role}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        {person.company} · {person.location}
      </p>
      <span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold capitalize text-blue-700">
        {person.status}
      </span>
      {children}
    </article>
  );
}

export function CareerReferrals() {
  const user = useCurrentUser() || {};
  const isAdmin = ["admin", "super_admin"].includes(user.role);
  const [form, setForm] = useState({
    targetRole: "",
    company: "",
    reason: "",
    resumeUrl: "",
    jobUrl: "",
    deadline: "",
  });
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const pipeline = ["requested", "under_review", "referred", "interviewing", "selected"];

  const fetchReferrals = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.get("/referrals");
      setReferrals(response.data.data.referrals);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load referral requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.targetRole.trim() || !form.company.trim() || !form.reason.trim()) {
      setMessage("Please fill role, company, and reason.");
      return;
    }

    try {
      const response = await api.post("/referrals", form);
      setReferrals((current) => [response.data.data.referral, ...current]);
      setForm({ targetRole: "", company: "", reason: "", resumeUrl: "", jobUrl: "", deadline: "" });
      setMessage("Referral request submitted successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit referral request.");
    }
  };

  const updateReferral = async (referralId, status) => {
    try {
      const response = await api.patch(`/referrals/${referralId}`, { status });
      const updated = response.data.data.referral;
      setReferrals((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setMessage(`Referral moved to ${status}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update referral.");
    }
  };

  return (
    <FeatureShell>
      <PageHeader
        eyebrow="Career referrals"
        title="Find opportunities shared by alumni."
        description="Request referral support, browse alumni-posted openings, and track career leads."
      />
      <section className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {pipeline.map((status, index) => (
          <div key={status} className="surface-card p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Stage {index + 1}</p>
            <p className="mt-1 text-sm font-black capitalize text-slate-900">{status.replace("_", " ")}</p>
            <p className="mt-2 text-2xl font-black text-indigo-600">{referrals.filter((item) => item.status === status).length}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {!isAdmin && <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
        >
          <h2 className="text-2xl font-extrabold text-slate-900">Request a referral</h2>
          <div className="mt-5 space-y-4">
            <input
              name="targetRole"
              value={form.targetRole}
              onChange={handleChange}
              className={inputClass}
              placeholder="Target role"
            />
            <input
              name="company"
              value={form.company}
              onChange={handleChange}
              className={inputClass}
              placeholder="Company"
            />
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              className={inputClass}
              rows="5"
              placeholder="Why are you a good fit?"
            />
            <input
              name="resumeUrl"
              value={form.resumeUrl}
              onChange={handleChange}
              className={inputClass}
              placeholder="Resume URL (optional)"
            />
            <input
              name="jobUrl"
              value={form.jobUrl}
              onChange={handleChange}
              className={inputClass}
              placeholder="Job posting URL (optional)"
            />
            <input
              name="deadline"
              type="date"
              value={form.deadline}
              onChange={handleChange}
              className={inputClass}
            />
            <button type="submit" className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white">
              <FaPaperPlane /> Submit Request
            </button>
          </div>
        </form>}

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
            Request tracking
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            {isAdmin ? "Referral administration queue" : "Your referral requests"}
          </h2>

          {loading && (
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
              Loading referral requests...
            </p>
          )}

          {message && (
            <p className="mt-5 rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
              {message}
            </p>
          )}

          <div className="mt-5 grid gap-4">
          {referrals.map((item) => (
            <article key={item._id} className="rounded-lg border border-slate-200 p-5">
              <FaBriefcase className="mb-4 text-2xl text-blue-700" />
              <h3 className="font-extrabold text-slate-900">{item.targetRole}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{item.company}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{item.reason}</p>
              <span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold capitalize text-blue-700">
                {item.status}
              </span>
              {item.adminNote && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                  Admin note: {item.adminNote}
                </p>
              )}
              {item.assignedToName && (
                <p className="mt-2 text-sm font-bold text-teal-700">
                  Assigned to: {item.assignedToName}
                </p>
              )}
              {!!item.statusHistory?.length && (
                <div className="mt-4 border-l-2 border-indigo-100 pl-4">
                  {item.statusHistory.slice().reverse().map((update, index) => (
                    <div key={`${update.status}-${update.changedAt}-${index}`} className="relative pb-3 text-xs font-semibold text-slate-500">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                      <strong className="capitalize text-slate-700">{update.status?.replace("_", " ")}</strong>
                      {update.changedAt && <span> · {new Date(update.changedAt).toLocaleDateString("en-IN")}</span>}
                      {update.note && <p className="mt-1">{update.note}</p>}
                    </div>
                  ))}
                </div>
              )}
              {(isAdmin || String(item.assignedTo) === String(user.id || user._id)) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {["under_review", "referred", "interviewing", "selected", "rejected"].map((status) => (
                    <button
                      type="button"
                      key={status}
                      onClick={() => updateReferral(item._id, status)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-extrabold capitalize text-slate-700"
                    >
                      {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
          </div>

          {!loading && !referrals.length && (
            <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
              No referral requests yet.
            </p>
          )}
        </section>
      </div>
    </FeatureShell>
  );
}

export function DiscussionForum() {
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    title: "",
    category: "Careers",
    message: "",
  });
  const [replyText, setReplyText] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const fetchTopics = async () => {
    try {
      const response = await api.get("/community/forum");
      setTopics(response.data.data.topics);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load forum topics.");
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setMessage("Please add topic title and message.");
      return;
    }

    try {
      const response = await api.post("/community/forum", form);
      setTopics((current) => [response.data.data.topic, ...current]);
      setForm({ title: "", category: "Careers", message: "" });
      setShowForm(false);
      setMessage("Topic created successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create topic.");
    }
  };

  const submitReply = async (topicId) => {
    const reply = replyText[topicId] || "";
    if (!reply.trim()) return;

    try {
      const response = await api.post(`/community/forum/${topicId}/replies`, {
        message: reply,
      });
      const updated = response.data.data.topic;
      setTopics((current) =>
        current.map((topic) => (topic._id === updated._id ? updated : topic))
      );
      setReplyText((current) => ({ ...current, [topicId]: "" }));
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to add reply.");
    }
  };

  return (
    <FeatureShell>
      <PageHeader
        eyebrow="Discussion forum"
        title="Start useful conversations with alumni."
        description="Create branch-wise, batch-wise, and topic-wise discussions for the community."
      />
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="mb-5 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white"
        >
          <FaPlus /> New Topic
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Topic title"
                className={inputClass}
              />
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                <option>Careers</option>
                <option>Higher Studies</option>
                <option>Entrepreneurship</option>
                <option>Placements</option>
                <option>Campus Life</option>
              </select>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                rows="3"
                placeholder="Start the discussion."
                className={`${inputClass} md:col-span-2`}
              />
            </div>
            <button type="submit" className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white">
              <FaPaperPlane /> Publish Topic
            </button>
          </form>
        )}

        {message && (
          <p className="mb-5 rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
            {message}
          </p>
        )}

        <div className="space-y-4">
          {topics.map((topic) => (
            <article key={topic._id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-slate-900">{topic.title}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {topic.category} · By {topic.authorName}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                <FaComments /> {topic.replies?.length || 0} replies
              </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{topic.message}</p>
              {!!topic.replies?.length && (
                <div className="mt-4 space-y-2">
                  {topic.replies.slice(-2).map((reply) => (
                    <p key={reply._id} className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                      <span className="font-extrabold text-slate-900">{reply.authorName}: </span>
                      {reply.message}
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <input
                  value={replyText[topic._id] || ""}
                  onChange={(event) =>
                    setReplyText((current) => ({
                      ...current,
                      [topic._id]: event.target.value,
                    }))
                  }
                  placeholder="Write a reply"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => submitReply(topic._id)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white"
                >
                  Reply
                </button>
              </div>
            </article>
          ))}
        </div>
        {!topics.length && (
          <p className="rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
            No discussion topics yet.
          </p>
        )}
      </div>
    </FeatureShell>
  );
}

export function ResourceLibrary() {
  const [resources, setResources] = useState([]);
  const [form, setForm] = useState({
    title: "",
    type: "Career",
    description: "",
    link: "",
  });
  const [message, setMessage] = useState("");

  const fetchResources = async () => {
    try {
      const response = await api.get("/community/resources");
      setResources(response.data.data.resources);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load resources.");
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage("Please add a resource title.");
      return;
    }

    try {
      const response = await api.post("/community/resources", form);
      setResources((current) => [response.data.data.resource, ...current]);
      setForm({ title: "", type: "Career", description: "", link: "" });
      setMessage("Resource added successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to add resource.");
    }
  };

  return (
    <FeatureShell>
      <PageHeader
        eyebrow="Resource library"
        title="Share and discover alumni resources."
        description="Collect templates, guides, prep material, and student-friendly resources in one place."
      />
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Add a resource</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Resource title"
            className={inputClass}
          />
          <select name="type" value={form.type} onChange={handleChange} className={inputClass}>
            <option>Career</option>
            <option>Placements</option>
            <option>Higher Studies</option>
            <option>Interview Prep</option>
            <option>Technical</option>
          </select>
          <input
            name="link"
            value={form.link}
            onChange={handleChange}
            placeholder="Optional link"
            className={inputClass}
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows="3"
            placeholder="Short description"
            className={`${inputClass} md:col-span-2`}
          />
        </div>
        <button type="submit" className="mt-4 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white">
          <FaPaperPlane /> Add Resource
        </button>
      </form>
      {message && (
        <section className="rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
          {message}
        </section>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {resources.map((resource) => (
          <article key={resource._id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <FaBookOpen className="mb-4 text-2xl text-blue-700" />
            <h2 className="font-extrabold text-slate-900">{resource.title}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">{resource.type}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              {resource.description || "No description added."}
            </p>
            {resource.link && (
              <a
                href={resource.link}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-extrabold text-slate-900"
              >
                View Resource
              </a>
            )}
          </article>
        ))}
      </div>
      {!resources.length && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
          No resources added yet.
        </section>
      )}
    </FeatureShell>
  );
}

export function Contributions() {
  const user = useCurrentUser() || {};
  const isAdmin = ["admin", "super_admin"].includes(user.role);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignForm, setCampaignForm] = useState({
    title: "",
    purpose: "",
    targetAmount: "",
  });
  const [pledges, setPledges] = useState({});
  const [message, setMessage] = useState("");

  const fetchCampaigns = async () => {
    try {
      const response = await api.get("/contributions");
      setCampaigns(response.data.data.campaigns);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load contribution campaigns.");
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCampaignChange = (event) => {
    const { name, value } = event.target;
    setCampaignForm((current) => ({ ...current, [name]: value }));
  };

  const createCampaign = async (event) => {
    event.preventDefault();
    if (!campaignForm.title.trim() || !campaignForm.purpose.trim()) {
      setMessage("Please add campaign title and purpose.");
      return;
    }

    try {
      const response = await api.post("/contributions", campaignForm);
      setCampaigns((current) => [response.data.data.campaign, ...current]);
      setCampaignForm({ title: "", purpose: "", targetAmount: "" });
      setMessage("Contribution campaign created.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create campaign.");
    }
  };

  const pledgeContribution = async (campaignId) => {
    const pledge = pledges[campaignId] || {};
    if (!pledge.amount) {
      setMessage("Please enter a pledge amount.");
      return;
    }

    try {
      const response = await api.post(`/contributions/${campaignId}/pledge`, pledge);
      const updated = response.data.data.campaign;
      setCampaigns((current) =>
        current.map((campaign) => (campaign._id === updated._id ? updated : campaign))
      );
      setPledges((current) => ({ ...current, [campaignId]: { amount: "", note: "" } }));
      setMessage("Contribution pledge recorded.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to record pledge.");
    }
  };

  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  return (
    <FeatureShell>
      <PageHeader
        eyebrow="Contributions"
        title="Support scholarships, labs, and student initiatives."
        description="Let alumni contribute to meaningful college initiatives with clear purpose and visibility."
      />
      {isAdmin && (
        <form onSubmit={createCampaign} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-2xl font-extrabold text-slate-900">Create contribution campaign</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input
              name="title"
              value={campaignForm.title}
              onChange={handleCampaignChange}
              placeholder="Campaign title"
              className={inputClass}
            />
            <input
              name="targetAmount"
              type="number"
              value={campaignForm.targetAmount}
              onChange={handleCampaignChange}
              placeholder="Target amount"
              className={inputClass}
            />
            <textarea
              name="purpose"
              value={campaignForm.purpose}
              onChange={handleCampaignChange}
              rows="3"
              placeholder="Purpose of this campaign"
              className={`${inputClass} md:col-span-2`}
            />
          </div>
          <button type="submit" className="mt-4 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white">
            <FaPaperPlane /> Create Campaign
          </button>
        </form>
      )}

      {message && (
        <section className="rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
          {message}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {campaigns.map((campaign) => {
          const target = Number(campaign.targetAmount || 0);
          const pledged = Number(campaign.pledgedAmount || 0);
          const percent = target ? Math.min((pledged / target) * 100, 100) : 0;

          return (
          <article key={campaign._id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <FaDonate className="mb-4 text-2xl text-blue-700" />
            <h2 className="font-extrabold text-slate-900">{campaign.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{campaign.purpose}</p>
            <p className="mt-4 text-sm font-bold text-slate-600">
              {currency.format(pledged)} pledged
              {target ? ` of ${currency.format(target)}` : ""}
            </p>
            {target > 0 && (
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-700" style={{ width: `${percent}%` }} />
              </div>
            )}
            <p className="mt-2 text-xs font-bold text-slate-500">
              {campaign.pledgeCount || 0} pledge(s)
            </p>
            {!isAdmin && (
              <div className="mt-5 space-y-3">
                <input
                  type="number"
                  value={pledges[campaign._id]?.amount || ""}
                  onChange={(event) =>
                    setPledges((current) => ({
                      ...current,
                      [campaign._id]: {
                        ...(current[campaign._id] || {}),
                        amount: event.target.value,
                      },
                    }))
                  }
                  placeholder="Amount"
                  className={inputClass}
                />
                <input
                  value={pledges[campaign._id]?.note || ""}
                  onChange={(event) =>
                    setPledges((current) => ({
                      ...current,
                      [campaign._id]: {
                        ...(current[campaign._id] || {}),
                        note: event.target.value,
                      },
                    }))
                  }
                  placeholder="Optional note"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => pledgeContribution(campaign._id)}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white"
                >
                  <FaHeart /> Pledge Contribution
                </button>
              </div>
            )}
          </article>
          );
        })}
      </div>
      {!campaigns.length && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
          No contribution campaigns created yet.
        </section>
      )}
    </FeatureShell>
  );
}

export function RecognitionWall() {
  const user = useCurrentUser() || {};
  const isAdmin = ["admin", "super_admin"].includes(user.role);
  const emptyRecognition = {
    name: "",
    achievement: "",
    year: new Date().getFullYear().toString(),
    batch: "",
    category: "Achievement",
  };
  const [recognitionForm, setRecognitionForm] = useState(emptyRecognition);
  const [recognitionFile, setRecognitionFile] = useState(null);
  const [honorees, setHonorees] = useState([]);
  const [editingRecognitionId, setEditingRecognitionId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecognitions = async () => {
      setLoading(true);
      try {
        const response = await api.get("/recognition");
        setHonorees(
          response.data.data.recognitions.map((item) => ({
            id: item._id,
            name: item.name,
            achievement: item.achievement,
            year: item.year,
            batch: item.batch || "",
            photoUrl: item.photoUrl || "",
            fileType: item.fileType || "",
            originalFileName: item.originalFileName || "",
            category: item.category || "Achievement",
          }))
        );
      } catch (error) {
        console.error("Recognition fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecognitions();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setRecognitionForm((current) => ({ ...current, [name]: value }));
  };

  const formatRecognition = (item) => ({
    id: item._id,
    name: item.name,
    achievement: item.achievement,
    year: item.year,
    batch: item.batch || "",
    photoUrl: item.photoUrl || "",
    fileType: item.fileType || "",
    originalFileName: item.originalFileName || "",
    category: item.category || "Achievement",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (
      !recognitionForm.name.trim() ||
      !recognitionForm.achievement.trim() ||
      !recognitionForm.year.trim()
    ) {
      return;
    }

    try {
      if (editingRecognitionId) {
        const formData = new FormData();
        Object.entries(recognitionForm).forEach(([key, value]) => {
          formData.append(key, value);
        });
        if (recognitionFile) formData.append("file", recognitionFile);

        const response = await api.patch(
          `/recognition/${editingRecognitionId}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        const updated = formatRecognition(response.data.data.recognition);
        setHonorees((current) =>
          current.map((item) =>
            item.id === editingRecognitionId ? updated : item
          )
        );
      } else {
        const formData = new FormData();
        Object.entries(recognitionForm).forEach(([key, value]) => {
          formData.append(key, value);
        });
        if (recognitionFile) formData.append("file", recognitionFile);

        const response = await api.post("/recognition", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const created = formatRecognition(response.data.data.recognition);
        setHonorees((current) => [created, ...current]);
      }

      setRecognitionForm(emptyRecognition);
      setRecognitionFile(null);
      setEditingRecognitionId(null);
    } catch (error) {
      console.error("Recognition save failed:", error);
    }
  };

  const handleEditRecognition = (item) => {
    setEditingRecognitionId(item.id);
    setRecognitionForm({
      name: item.name,
      achievement: item.achievement,
      year: item.year,
      batch: item.batch || "",
      category: item.category,
    });
    setRecognitionFile(null);
  };

  const handleCancelEdit = () => {
    setEditingRecognitionId(null);
    setRecognitionForm(emptyRecognition);
    setRecognitionFile(null);
  };

  const handleDeleteRecognition = async (recognitionId) => {
    try {
      await api.delete(`/recognition/${recognitionId}`);
      setHonorees((current) =>
        current.filter((item) => item.id !== recognitionId)
      );
      if (editingRecognitionId === recognitionId) handleCancelEdit();
    } catch (error) {
      console.error("Recognition delete failed:", error);
    }
  };

  return (
    <FeatureShell>
      <PageHeader
        eyebrow="Recognition wall"
        title="Celebrate alumni achievements."
        description="Highlight awards, promotions, startups, publications, and community contributions."
      />

      {loading && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500 shadow-sm">
          Loading recognitions from database...
        </section>
      )}

      {isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <FaAward />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {editingRecognitionId ? "Edit recognition" : "Add recognition"}
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Highlight alumni achievements, awards, launches, or
                contributions.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="name"
              value={recognitionForm.name}
              onChange={handleChange}
              placeholder="Alumni name"
              className={inputClass}
            />
            <input
              name="year"
              value={recognitionForm.year}
              onChange={handleChange}
              placeholder="Achievement year, e.g. 2026"
              className={inputClass}
            />
            <input
              name="batch"
              value={recognitionForm.batch}
              onChange={handleChange}
              placeholder="Batch / passing year, e.g. 2022"
              className={inputClass}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-600">
                Alumni photo / file
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => setRecognitionFile(event.target.files[0] || null)}
                className={inputClass}
              />
            </label>
            <select
              name="category"
              value={recognitionForm.category}
              onChange={handleChange}
              className={inputClass}
            >
              <option>Achievement</option>
              <option>Promotion</option>
              <option>Award</option>
              <option>Startup</option>
              <option>Publication</option>
              <option>Community Contribution</option>
            </select>
            <textarea
              name="achievement"
              value={recognitionForm.achievement}
              onChange={handleChange}
              rows="3"
              placeholder="Describe the achievement."
              className={`${inputClass} md:col-span-2`}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white transition hover:bg-blue-800"
            >
              <FaPaperPlane />{" "}
              {editingRecognitionId ? "Update Recognition" : "Publish Recognition"}
            </button>
            {editingRecognitionId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 font-extrabold text-slate-900 transition hover:border-slate-900"
              >
                <FaTimes /> Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {honorees.map((person) => (
          <article key={person.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950 text-lg font-extrabold text-white">
                {person.photoUrl && person.fileType !== "application/pdf" ? (
                  <img
                    src={person.photoUrl}
                    alt={`${person.name} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  person.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                )}
              </div>
              <FaAward className="text-3xl text-blue-700" />
            </div>
            <h2 className="font-extrabold text-slate-900">{person.name}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{person.achievement}</p>
            {person.photoUrl && person.fileType === "application/pdf" && (
              <a
                href={person.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-xs font-extrabold text-slate-900 transition hover:border-slate-900"
              >
                View uploaded PDF
              </a>
            )}
            <span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
              {person.category} · {person.year}
            </span>
            <span className="ml-2 mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
              Batch {person.batch || "Not added"}
            </span>
            {isAdmin && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleEditRecognition(person)}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
                >
                  <FaEdit /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRecognition(person.id)}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 font-extrabold text-red-700 transition hover:bg-red-100"
                >
                  <FaTrash /> Delete
                </button>
              </div>
            )}
          </article>
        ))}
      </div>

      {!loading && !honorees.length && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-900">
            No recognitions posted yet
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Alumni achievements will appear here after an admin publishes them.
          </p>
        </section>
      )}
    </FeatureShell>
  );
}
