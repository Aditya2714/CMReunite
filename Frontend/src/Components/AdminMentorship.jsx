import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaCheckCircle,
  FaHandsHelping,
  FaSyncAlt,
  FaTimesCircle,
} from "react-icons/fa";

const statusOptions = ["accepted", "completed", "rejected"];

function AdminMentorship() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState({});

  const fetchRequests = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.get("/mentorship");
      setRequests(response.data.data.requests);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load mentorship requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (requestId, status) => {
    setMessage("");

    try {
      const response = await api.patch(`/mentorship/${requestId}`, {
        status,
        adminNote: notes[requestId] || "",
      });
      const updated = response.data.data.request;
      setRequests((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setMessage(`Mentorship request marked as ${status}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update mentorship request.");
    }
  };

  const counts = {
    total: requests.length,
    pending: requests.filter((item) => item.status === "pending").length,
    accepted: requests.filter((item) => item.status === "accepted").length,
    completed: requests.filter((item) => item.status === "completed").length,
  };

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
            Admin mentorship
          </p>
          <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
            Manage alumni mentorship requests.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            Review requests submitted by alumni and update their status based on
            guidance availability.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Total", counts.total],
            ["Pending", counts.pending],
            ["Accepted", counts.accepted],
            ["Completed", counts.completed],
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <strong className="mt-2 block text-3xl font-extrabold text-slate-900">
                {value}
              </strong>
            </article>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-600">
                Request queue
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                Submitted mentorship requests
              </h2>
            </div>
            <button
              type="button"
              onClick={fetchRequests}
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
            Loading mentorship requests...
          </section>
        ) : requests.length ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {requests.map((item) => (
              <article
                key={item._id}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 grid h-12 w-12 place-items-center rounded-lg bg-blue-50 text-blue-700">
                      <FaHandsHelping />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      {item.topic}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {item.requesterName} · {item.requesterEmail}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold capitalize text-blue-700">
                    {item.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm font-semibold text-slate-500">
                  <p>Preferred mode: {item.mode}</p>
                  <p className="leading-6">{item.message}</p>
                  {item.adminNote && (
                    <p className="rounded-lg bg-slate-50 p-3">
                      Admin note: {item.adminNote}
                    </p>
                  )}
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Admin note
                  </span>
                  <textarea
                    rows="3"
                    value={notes[item._id] ?? item.adminNote ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [item._id]: event.target.value,
                      }))
                    }
                    placeholder="Optional note for this request"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateStatus(item._id, status)}
                      className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-4 font-extrabold capitalize transition ${
                        status === "rejected"
                          ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-blue-700 text-white hover:bg-blue-800"
                      }`}
                    >
                      {status === "rejected" ? <FaTimesCircle /> : <FaCheckCircle />}
                      {status}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-900">
              No mentorship requests yet
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Alumni-submitted mentorship requests will appear here.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

export default AdminMentorship;
