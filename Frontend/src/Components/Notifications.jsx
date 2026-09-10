import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBell, FaCheckDouble, FaCog } from "react-icons/fa";
import api from "../services/api";
import { connectRealtime } from "../services/realtime";

function Notifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    inApp: true, email: false, digest: "instant",
    quietHoursStart: "22:00", quietHoursEnd: "07:00",
  });
  const [message, setMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      const response = await api.get("/notifications", { params: { type: filter, unread: unreadOnly || undefined } });
      setItems(response.data.data.notifications);
      setUnreadCount(response.data.data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [filter, unreadOnly]);

  useEffect(() => {
    loadNotifications();
    const socket = connectRealtime();
    const receive = (notification) => {
      setItems((current) => [notification, ...current]);
      setUnreadCount((count) => count + 1);
    };
    socket.on("notification:new", receive);
    return () => socket.off("notification:new", receive);
  }, [loadNotifications]);

  useEffect(() => {
    api.get("/notifications/preferences")
      .then(({ data }) => setPreferences((current) => ({ ...current, ...(data.data.preferences || {}) })))
      .catch(() => {});
  }, []);

  const markRead = async (notification) => {
    if (!notification.readAt) {
      await api.patch(`/notifications/${notification._id}/read`);
      setItems((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
      setUnreadCount((count) => Math.max(count - 1, 0));
    }
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  const savePreferences = async () => {
    const { data } = await api.patch("/notifications/preferences", preferences);
    setPreferences(data.data.preferences);
    setMessage("Notification preferences saved.");
    setShowSettings(false);
  };

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-950 p-6 text-white">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-200">
              Notification center
            </p>
            <h1 className="mt-2 text-3xl font-extrabold">Updates that need your attention</h1>
            <p className="mt-2 text-sm font-semibold text-slate-300">
              {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={!unreadCount}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 font-extrabold text-slate-950 disabled:opacity-50"
          >
            <FaCheckDouble /> Mark all read
          </button>
          <button type="button" onClick={() => setShowSettings((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-4 py-3 font-extrabold text-white">
            <FaCog /> Preferences
          </button>
        </header>

        <section className="flex flex-wrap gap-2" aria-label="Notification filters">
          {["all", "event", "mentorship", "referral", "message", "connection", "announcement"].map((type) => (
            <button key={type} onClick={() => setFilter(type)} className={`rounded-full px-4 py-2 text-xs font-black capitalize ${filter === type ? "bg-indigo-600 text-white" : "bg-white text-slate-600"}`}>{type}</button>
          ))}
          <label className="ml-auto flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600">
            <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} className="accent-indigo-600" /> Unread only
          </label>
        </section>

        {showSettings && (
          <section className="surface-card grid gap-4 p-6 md:grid-cols-2">
            <label className="text-sm font-bold text-slate-600">Digest frequency
              <select value={preferences.digest} onChange={(event) => setPreferences((current) => ({ ...current, digest: event.target.value }))} className="form-control mt-2">
                {["instant", "daily", "weekly", "off"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold text-slate-600">Quiet from<input type="time" value={preferences.quietHoursStart} onChange={(event) => setPreferences((current) => ({ ...current, quietHoursStart: event.target.value }))} className="form-control mt-2" /></label>
              <label className="text-sm font-bold text-slate-600">Quiet until<input type="time" value={preferences.quietHoursEnd} onChange={(event) => setPreferences((current) => ({ ...current, quietHoursEnd: event.target.value }))} className="form-control mt-2" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={preferences.inApp} onChange={(event) => setPreferences((current) => ({ ...current, inApp: event.target.checked }))} /> In-app notifications</label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={preferences.email} onChange={(event) => setPreferences((current) => ({ ...current, email: event.target.checked }))} /> Email notifications</label>
            <button onClick={savePreferences} className="primary-button md:col-span-2">Save preferences</button>
          </section>
        )}
        {message && <p role="status" className="rounded-xl bg-teal-50 p-4 text-sm font-bold text-teal-800">{message}</p>}

        {loading && <p className="rounded-lg bg-white p-5 font-semibold">Loading notifications…</p>}
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item._id}
              className={`rounded-lg border p-5 shadow-sm ${
                item.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-700 text-white">
                  <FaBell />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-slate-900">{item.title}</h2>
                  <span className="mt-1 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">{item.type}</span>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{item.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {item.link && (
                      <Link
                        to={item.link}
                        onClick={() => markRead(item)}
                        className="text-sm font-extrabold text-blue-700"
                      >
                        View update
                      </Link>
                    )}
                    {!item.readAt && (
                      <button
                        type="button"
                        onClick={() => markRead(item)}
                        className="text-sm font-extrabold text-slate-600"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!loading && !items.length && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center font-semibold text-slate-500">
            You do not have any notifications yet.
          </p>
        )}
      </section>
    </main>
  );
}

export default Notifications;
