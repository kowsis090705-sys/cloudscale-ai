import { useNavigate } from "react-router-dom";

export default function EventCard({ event }) {
  const navigate = useNavigate();

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "16px", width: "260px" }}>
      <small>{event.type}</small>
      <h3 style={{ margin: "6px 0" }}>{event.name}</h3>
      <p style={{ margin: "4px 0" }}>{event.venue}</p>
      <p style={{ margin: "4px 0" }}>{event.date} at {event.time}</p>
      <p style={{ margin: "4px 0" }}><b>₹{event.price}</b> | {event.seatsLeft} seats left</p>
      <button onClick={() => navigate(`/events/${event.id}/seats`)}>Book Now</button>
    </div>
  );
}