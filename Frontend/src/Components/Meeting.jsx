import { useEffect, useState } from "react";
import api from "../services/api";
import { FaCheckCircle, FaHandsHelping, FaPaperPlane, FaTimesCircle } from "react-icons/fa";

const topics = [
  "Career Guidance",
  "Resume Review",
  "Interview Prep",
  "Higher Studies",
  "Startup Advice",
];

const preferredModes = ["In-person", "Phone call", "Email", "Chat", "Flexible"];

function Mentorship() {
  const [request, setRequest] = useState({
    topic: topics[0],
    mode: "Flexible",
    mentorId: "",
    message: "",
    goal: "",
    expectedOutcome: "",
  });

  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [progressDrafts, setProgressDrafts] = useState({});

  const fetchRequests = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.get("/mentorship");
      setSentRequests(response.data.data.sent || response.data.data.requests || []);
      setReceivedRequests(response.data.data.received || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load mentorship requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const fetchMentors = async () => {
      try {
        const response = await api.get("/mentorship/mentors");
        setMentors(response.data.data.mentors);
        setRequest((current) => ({
          ...current,
          mentorId: current.mentorId || response.data.data.mentors[0]?.id || "",
        }));
      } catch (error) {
        setMessage(error.response?.data?.message || "Unable to load mentor list.");
      }
    };

    fetchMentors();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setRequest((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!request.mentorId || !request.message.trim()) {
      setMessage("Please select a mentor and enter your request message.");
      return;
    }

    try {
      const response = await api.post("/mentorship", request);
      setSentRequests((current) => [response.data.data.request, ...current]);
      setRequest((current) => ({
        topic: topics[0],
        mode: "Flexible",
        mentorId: current.mentorId,
        message: "",
        goal: "",
        expectedOutcome: "",
      }));
      setMessage("Mentorship request submitted successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit mentorship request.");
    }
  };

  const updateProgress = async (requestId, payload) => {
    try {
      const response = await api.post(`/mentorship/${requestId}/progress`, payload);
      const updated = response.data.data.request;
      setSentRequests((current) => current.map((item) => item._id === updated._id ? updated : item));
      setReceivedRequests((current) => current.map((item) => item._id === updated._id ? updated : item));
      setProgressDrafts((current) => ({ ...current, [requestId]: {} }));
      setMessage("Mentorship progress updated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update progress.");
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      const response = await api.patch(`/mentorship/${requestId}`, { status });
      const updated = response.data.data.request;
      setReceivedRequests((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setMessage(`Mentorship request ${status}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update mentorship request.");
    }
  };

  const scheduleRequest = async (requestId) => {
    const draft = scheduleDrafts[requestId] || {};
    if (!draft.scheduledAt) {
      setMessage("Choose a date and time before scheduling.");
      return;
    }
    try {
      const response = await api.patch(`/mentorship/${requestId}`, {
        scheduledAt: draft.scheduledAt,
        meetingLink: draft.meetingLink || "",
      });
      const updated = response.data.data.request;
      setReceivedRequests((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setMessage("Mentorship session scheduled.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to schedule session.");
    }
  };

  const submitFeedback = async (requestId) => {
    const draft = feedbackDrafts[requestId] || {};
    if (!draft.rating) {
      setMessage("Select a rating before submitting feedback.");
      return;
    }
    try {
      const response = await api.patch(`/mentorship/${requestId}`, {
        rating: Number(draft.rating),
        feedback: draft.feedback || "",
      });
      const updated = response.data.data.request;
      setSentRequests((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setMessage("Thank you for your mentorship feedback.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit feedback.");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
            Mentorship
          </p>
          <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
            Request guidance from the CMRIT network.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            Ask alumni or faculty for help with careers, resumes, interviews,
            higher studies, or startup ideas through the mode that works best
            for you.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <FaHandsHelping />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  New mentorship request
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  Choose a mentor, topic, and preferred response mode.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Topic
                </span>
                <select
                  name="topic"
                  value={request.topic}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {topics.map((topic) => (
                    <option key={topic}>{topic}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">Mentorship goal</span>
                <input name="goal" value={request.goal} onChange={handleChange} placeholder="e.g. Become interview-ready in six weeks" className={inputClass} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">Expected outcome</span>
                <input name="expectedOutcome" value={request.expectedOutcome} onChange={handleChange} placeholder="e.g. Complete two mock interviews" className={inputClass} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Select mentor alumni
                </span>
                <select
                  name="mentorId"
                  value={request.mentorId}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {mentors.map((mentor) => (
                    <option key={mentor.id} value={mentor.id}>
                      {mentor.name} · {mentor.designation} · {mentor.company}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Preferred mode
                </span>
                <select
                  name="mode"
                  value={request.mode}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {preferredModes.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Request message
                </span>
                <textarea
                  name="message"
                  value={request.message}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Briefly explain what guidance you need."
                  className={inputClass}
                />
              </label>

              <button
                type="submit"
                disabled={!mentors.length}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white transition hover:bg-blue-800"
              >
                <FaPaperPlane /> Submit Request
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
              Requests
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              Sent mentorship requests
            </h2>

            {loading && (
              <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">
                Loading requests from database...
              </p>
            )}

            {message && (
              <p className="mt-5 rounded-lg bg-blue-50 p-4 text-sm font-bold text-blue-700">
                {message}
              </p>
            )}

            <div className="mt-5 space-y-4">
              {sentRequests.map((item) => (
                <MentorshipCard key={item._id} item={item} context="sent">
                  {item.status === "completed" && !item.rating && (
                    <div className="mt-4 grid gap-3">
                      <select
                        value={feedbackDrafts[item._id]?.rating || ""}
                        onChange={(event) =>
                          setFeedbackDrafts((current) => ({
                            ...current,
                            [item._id]: {
                              ...current[item._id],
                              rating: event.target.value,
                            },
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="">Rate this session</option>
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <option key={rating} value={rating}>{rating} star{rating === 1 ? "" : "s"}</option>
                        ))}
                      </select>
                      <textarea
                        rows="3"
                        value={feedbackDrafts[item._id]?.feedback || ""}
                        onChange={(event) =>
                          setFeedbackDrafts((current) => ({
                            ...current,
                            [item._id]: {
                              ...current[item._id],
                              feedback: event.target.value,
                            },
                          }))
                        }
                        placeholder="Share what was helpful"
                        className={inputClass}
                      />
                      <button type="button" onClick={() => submitFeedback(item._id)} className="rounded-lg bg-blue-700 px-4 py-3 font-extrabold text-white">
                        Submit feedback
                      </button>
                    </div>
                  )}
                </MentorshipCard>
              ))}
            </div>
            {!loading && !sentRequests.length && (
              <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
                No sent mentorship requests yet.
              </p>
            )}
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
            Mentor inbox
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            Requests received from alumni
          </h2>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {receivedRequests.map((item) => (
              <MentorshipCard key={item._id} item={item} context="received">
                {["accepted", "scheduled"].includes(item.status) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      type="datetime-local"
                      value={scheduleDrafts[item._id]?.scheduledAt || ""}
                      onChange={(event) =>
                        setScheduleDrafts((current) => ({
                          ...current,
                          [item._id]: { ...current[item._id], scheduledAt: event.target.value },
                        }))
                      }
                      className={inputClass}
                    />
                    <input
                      value={scheduleDrafts[item._id]?.meetingLink || ""}
                      onChange={(event) =>
                        setScheduleDrafts((current) => ({
                          ...current,
                          [item._id]: { ...current[item._id], meetingLink: event.target.value },
                        }))
                      }
                      placeholder="Meeting link or location"
                      className={inputClass}
                    />
                    <button type="button" onClick={() => scheduleRequest(item._id)} className="rounded-lg bg-teal-600 px-4 py-3 font-extrabold text-white sm:col-span-2">
                      Schedule session
                    </button>
                  </div>
                )}
                {["accepted", "scheduled"].includes(item.status) && (
                  <ProgressEditor item={item} drafts={progressDrafts} setDrafts={setProgressDrafts} updateProgress={updateProgress} inputClass={inputClass} />
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => updateRequestStatus(item._id, "accepted")}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
                  >
                    <FaCheckCircle /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRequestStatus(item._id, "completed")}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-extrabold text-white transition hover:bg-blue-800"
                  >
                    <FaCheckCircle /> Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRequestStatus(item._id, "rejected")}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    <FaTimesCircle /> Reject
                  </button>
                </div>
              </MentorshipCard>
            ))}
          </div>

          {!loading && !receivedRequests.length && (
            <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-5 text-sm font-semibold text-slate-500">
              No mentorship requests received yet.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function MentorshipCard({ item, context, children }) {
  return (
    <article className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900">{item.topic}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {context === "received"
              ? `From: ${item.requesterName}`
              : `Mentor: ${item.mentorName}`}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Preferred mode: {item.mode}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold capitalize text-blue-700">
          {item.status}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
        {item.message}
      </p>
      {item.goal && <p className="mt-3 rounded-lg bg-indigo-50 p-3 text-sm font-bold text-indigo-800">Goal: {item.goal}</p>}
      {!!item.milestones?.length && (
        <div className="mt-3 space-y-2">
          {item.milestones.map((milestone) => (
            <div key={milestone._id} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${milestone.completed ? "bg-teal-500" : "bg-slate-300"}`} />
              <span className={milestone.completed ? "line-through" : ""}>{milestone.title}</span>
            </div>
          ))}
        </div>
      )}
      {item.adminNote && (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-500">
          Admin note: {item.adminNote}
        </p>
      )}
      {item.scheduledAt && (
        <p className="mt-3 rounded-lg bg-teal-50 p-3 text-sm font-semibold text-teal-800">
          Scheduled: {new Date(item.scheduledAt).toLocaleString("en-IN")}
          {item.meetingLink ? ` · ${item.meetingLink}` : ""}
        </p>
      )}
      {item.rating && (
        <p className="mt-3 text-sm font-bold text-amber-600">
          Session rating: {item.rating}/5 {item.feedback ? `· ${item.feedback}` : ""}
        </p>
      )}
      {children}
    </article>
  );
}

function ProgressEditor({ item, drafts, setDrafts, updateProgress, inputClass }) {
  const draft = drafts[item._id] || {};
  return (
    <div className="mt-4 rounded-xl bg-slate-50 p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Progress workspace</p>
      <input value={draft.title || ""} onChange={(event) => setDrafts((current) => ({ ...current, [item._id]: { ...draft, title: event.target.value } }))} placeholder="Add next milestone" className={inputClass} />
      <textarea value={draft.note || ""} onChange={(event) => setDrafts((current) => ({ ...current, [item._id]: { ...draft, note: event.target.value } }))} placeholder="Add a progress note" rows="2" className={`${inputClass} mt-2`} />
      <button type="button" onClick={() => updateProgress(item._id, draft)} className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white">Save progress</button>
      {!!item.milestones?.filter((milestone) => !milestone.completed).length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.milestones.filter((milestone) => !milestone.completed).map((milestone) => (
            <button key={milestone._id} type="button" onClick={() => updateProgress(item._id, { milestoneId: milestone._id, completed: true })} className="rounded-full border border-teal-300 px-3 py-1 text-xs font-bold text-teal-700">Complete: {milestone.title}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Mentorship;
