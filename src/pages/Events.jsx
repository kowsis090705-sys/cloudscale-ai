import { useState, useEffect } from "react";
import { fetchEvents } from "../api/client";
import EventCard from "../components/EventCard";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => setError("Could not load events. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "16px" }}>
      <h2>Upcoming Events</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#c62828" }}>{error}</p>}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}