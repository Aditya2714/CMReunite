import { useEffect, useState } from "react";
import api from "../services/api";
import {
  FaCalendarAlt,
  FaEdit,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaTimes,
  FaTrash,
  FaUsers,
} from "react-icons/fa";
import { useCurrentUser } from "../services/authService";

const emptyEventForm = {
  title: "",
  date: "",
  time: "",
  location: "",
  type: "Campus Event",
  description: "",
  capacity: 100,
  registrationDeadline: "",
  eligibility: "department",
  department: "",
  scope: "department",
};

const formatEventForUi = (event) => ({
  id: event._id,
  scope: event.scope,
  department: event.department,
  eligibility: event.eligibility,
  rawDate: event.date ? event.date.slice(0, 10) : "",
  title: event.title,
  date: new Date(event.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }),
  time: event.time || "10:00 AM",
  location: event.location,
  type: event.type || "Campus Event",
  attendees: event.attendees || 0,
  capacity: event.capacity || 100,
  registrationDeadline: event.registrationDeadline?.slice(0, 10) || "",
  registrationStatus: event.registrationStatus,
  checkInCode: event.checkInCode,
  status:
    event.registrationStatus === "waitlisted"
      ? "Waitlisted"
      : event.isRegistered
        ? "Registered"
        : "Register",
  description: event.description,
});

function Event() {
  const user = useCurrentUser() || {};
  const isAdmin = ["admin", "super_admin"].includes(user.role);
  const [departments, setDepartments] = useState([]);
  useEffect(() => { api.get("/departments").then((response) => setDepartments(response.data.data.departments)).catch(() => {}); }, []);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [events, setEvents] = useState([]);
  const [editingEventId, setEditingEventId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkInCodes, setCheckInCodes] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await api.get("/event/all");
        const eventList = response.data.data.events.map(formatEventForUi);
        setEvents(eventList);
      } catch (error) {
        console.error("Events fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleRegister = async (eventId) => {
    try {
      const response = await api.post(`/event/${eventId}/register`);
      const updatedEvent = formatEventForUi(response.data.data.event);
      setEvents((current) =>
        current.map((event) => (event.id === eventId ? updatedEvent : event))
      );
    } catch (error) {
      setMessage(error.response?.data?.message || "Event registration failed.");
    }
  };

  const handleEventFormChange = (event) => {
    const { name, value } = event.target;
    setEventForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveEvent = async (event) => {
    event.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date || !eventForm.location.trim()) return;

    try {
      if (editingEventId) {
        const response = await api.patch(`/event/${editingEventId}`, Object.fromEntries(Object.entries(eventForm).filter(([key]) => !["department", "scope"].includes(key))));
        const updatedEvent = formatEventForUi(response.data.data.event);
        setEvents((current) =>
          current.map((item) =>
            item.id === editingEventId ? { ...updatedEvent, status: item.status } : item
          )
        );
      } else {
        const response = await api.post("/event/create", {
          ...eventForm,
          attendees: 0,
        });
        const createdEvent = formatEventForUi(response.data.data.event);
        setEvents((current) => [createdEvent, ...current]);
      }
      setEventForm(emptyEventForm);
      setEditingEventId(null);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save event.");
    }
  };

  const handleEditEvent = (event) => {
    setEditingEventId(event.id);
    setEventForm({
      scope: event.scope,
      department: event.department || "",
      eligibility: event.eligibility,
      title: event.title,
      date: event.rawDate,
      time: event.time,
      location: event.location,
      type: event.type,
      description: event.description,
      capacity: event.capacity,
      registrationDeadline: event.registrationDeadline,
    });
  };

  const handleCheckIn = async (eventId) => {
    try {
      const response = await api.post(`/event/${eventId}/check-in`, {
        checkInCode: checkInCodes[eventId],
      });
      setMessage(`Attendance confirmed for ${response.data.data.registration.user.email}.`);
      setCheckInCodes((current) => ({ ...current, [eventId]: "" }));
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to check in attendee.");
    }
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setEventForm(emptyEventForm);
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await api.delete(`/event/${eventId}`);
      setEvents((current) => current.filter((event) => event.id !== eventId));
      if (editingEventId === eventId) handleCancelEdit();
    } catch (error) {
      console.error("Event delete failed:", error);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100";

  return (
    <main className="bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p className="mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-teal-100">
            Events
          </p>
          <h1 className="text-3xl font-extrabold tracking-normal md:text-4xl">
            Discover alumni meets, webinars, and reunions.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            Stay connected with the CMRIT community through campus events,
            online sessions, and batch gatherings.
          </p>
          {loading && (
            <p className="mt-3 text-sm font-semibold text-teal-100">
              Loading events from database...
            </p>
          )}
          {message && <p className="mt-3 text-sm font-semibold text-teal-100">{message}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Upcoming</p>
            <strong className="mt-2 block text-3xl font-extrabold text-slate-900">
              {events.length}
            </strong>
            <span className="mt-1 block text-sm font-semibold text-slate-500">
              active event listings
            </span>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Attendees</p>
            <strong className="mt-2 block text-3xl font-extrabold text-slate-900">
              {events.reduce((total, event) => total + event.attendees, 0)}
            </strong>
            <span className="mt-1 block text-sm font-semibold text-slate-500">
              alumni and students
            </span>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">Registered</p>
            <strong className="mt-2 block text-3xl font-extrabold text-slate-900">
              {events.filter((event) => event.status === "Registered").length}
            </strong>
            <span className="mt-1 block text-sm font-semibold text-slate-500">
              events selected by you
            </span>
          </article>
        </div>

        {isAdmin && (
          <form
            onSubmit={handleSaveEvent}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <FaCalendarAlt />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {editingEventId ? "Edit event" : "Post a new event"}
                </h2>
                <p className="text-sm font-semibold text-slate-500">
                  {editingEventId
                    ? "Update event details and publish the changes."
                    : "Create campus meets, webinars, reunions, or alumni sessions."}
                </p>
              </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              {user.role === "super_admin" && <><label>Event scope<select aria-label="Event scope" name="scope" disabled={!!editingEventId} value={eventForm.scope} onChange={handleEventFormChange} className={inputClass}><option value="department">Department</option><option value="platform">Platform-wide</option></select></label>{eventForm.scope === "department" && <label>Owning department<select aria-label="Owning department" name="department" disabled={!!editingEventId} value={eventForm.department} onChange={handleEventFormChange} required className={inputClass}><option value="">Select department</option>{departments.map((department) => <option key={department._id} value={department._id}>{department.code}</option>)}</select></label>}</>}
              {eventForm.scope !== "platform" && <label>Attendance eligibility<select aria-label="Attendance eligibility" name="eligibility" value={eventForm.eligibility} onChange={handleEventFormChange} className={inputClass}><option value="department">Owning department only</option><option value="all">All departments</option></select></label>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="title"
                value={eventForm.title}
                onChange={handleEventFormChange}
                placeholder="Event title"
                className={inputClass}
              />
              <select
                name="type"
                value={eventForm.type}
                onChange={handleEventFormChange}
                className={inputClass}
              >
                <option>Campus Event</option>
                <option>Webinar</option>
                <option>Reunion</option>
                <option>Workshop</option>
                <option>Mentorship Session</option>
              </select>
              <input
                aria-label="Event date"
                name="date"
                type="date"
                value={eventForm.date}
                onChange={handleEventFormChange}
                className={inputClass}
              />
              <input
                name="time"
                value={eventForm.time}
                onChange={handleEventFormChange}
                placeholder="10:00 AM"
                className={inputClass}
              />
              <input
                name="location"
                value={eventForm.location}
                onChange={handleEventFormChange}
                placeholder="CMRIT Auditorium / Online"
                className={inputClass}
              />
              <input
                name="capacity"
                type="number"
                min="1"
                value={eventForm.capacity}
                onChange={handleEventFormChange}
                placeholder="Capacity"
                className={inputClass}
              />
              <label className="block text-sm font-bold text-slate-600">
                Registration deadline
                <input
                  name="registrationDeadline"
                  type="date"
                  value={eventForm.registrationDeadline}
                  onChange={handleEventFormChange}
                  className={`${inputClass} mt-2`}
                />
              </label>
              <textarea
                name="description"
                value={eventForm.description}
                onChange={handleEventFormChange}
                rows="3"
                placeholder="Describe the event, audience, and purpose."
                className={`${inputClass} md:col-span-2`}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 font-extrabold text-white transition hover:bg-blue-800"
              >
                <FaPaperPlane /> {editingEventId ? "Update Event" : "Publish Event"}
              </button>
              {editingEventId && (
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

        <section className="grid gap-4 lg:grid-cols-3">
          {events.map((event) => (
            <article
              key={event.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                {event.type}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">
                {event.title}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                {event.description}
              </p>

              <div className="mt-5 space-y-2 text-sm font-semibold text-slate-500">
                <p className="flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-700" /> {event.date} ·{" "}
                  {event.time}
                </p>
                <p className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-700" /> {event.location}
                </p>
                <p className="flex items-center gap-2">
                  <FaUsers className="text-blue-700" /> {event.attendees}/{event.capacity} attending
                </p>
              </div>
              {event.checkInCode && (
                <p className="mt-3 rounded-lg bg-teal-50 p-3 text-sm font-extrabold text-teal-800">
                  Check-in code: {event.checkInCode}
                </p>
              )}

              {isAdmin ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleEditEvent(event)}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 font-extrabold text-white transition hover:bg-blue-800"
                  >
                    <FaEdit /> Edit
                  </button>
                  <input
                    value={checkInCodes[event.id] || ""}
                    onChange={(inputEvent) =>
                      setCheckInCodes((current) => ({
                        ...current,
                        [event.id]: inputEvent.target.value,
                      }))
                    }
                    placeholder="Attendee check-in code"
                    className={`${inputClass} sm:col-span-2`}
                  />
                  <button
                    type="button"
                    onClick={() => handleCheckIn(event.id)}
                    className="rounded-lg bg-teal-600 px-4 py-3 font-extrabold text-white sm:col-span-2"
                  >
                    Confirm attendance
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 font-extrabold text-red-700 transition hover:bg-red-100"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRegister(event.id)}
                  className={`mt-5 inline-flex min-h-[42px] w-full items-center justify-center rounded-lg px-4 font-extrabold transition ${
                    event.status === "Registered"
                      ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                      : "bg-blue-700 text-white hover:bg-blue-800"
                  }`}
                >
                  {event.status}
                </button>
              )}
            </article>
          ))}
        </section>

        {!loading && !events.length && (
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-900">
              No events posted yet
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Events will appear here after an admin publishes them.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}

export default Event;
