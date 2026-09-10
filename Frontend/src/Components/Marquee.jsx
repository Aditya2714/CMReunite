import { useEffect, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import api from "../services/api";

const fallbackEvents = [
  "Annual Alumni Meet — Coming Soon",
  "Tech Talk: AI in Industry — Coming Soon",
  "Career Fair 2026 — Coming Soon",
];

function Marquee() {
  const [events, setEvents] = useState(fallbackEvents);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await api.get("/event/upcoming");
        const upcoming = data.data.events;
        if (upcoming.length > 0) {
          setEvents(
            upcoming.map((e) => {
              const d = new Date(e.date);
              const day = d.getDate();
              const month = d.toLocaleString("default", { month: "short" });
              const year = d.getFullYear();
              return `${e.title} — ${day} ${month} ${year}, ${e.location}`;
            })
          );
        }
      } catch (err) {
        // keep fallback events
      }
    };
    fetchEvents();
  }, []);

  const items = events.length > 0 ? events : fallbackEvents;

  return (
    <div className="marquee-wrapper">
      <div className="marquee-label">
        <FaCalendarAlt className="mr-2 text-sm" />
        Latest Events
      </div>
      <div className="marquee-track">
        <div className="marquee-content">
          {[...items, ...items].map((event, i) => (
            <span key={i} className="marquee-item">
              {event}
              <span className="marquee-dot">&#9679;</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Marquee;
