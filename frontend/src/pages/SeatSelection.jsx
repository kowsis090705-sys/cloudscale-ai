import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEvent, fetchSeats, createBooking } from "../api/client";
import SeatGrid from "../components/SeatGrid";

export default function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const ev = await fetchEvent(id);
        if (!ev) {
          setError("Event not found.");
          return;
        }
        setEvent(ev);
        setSeats(await fetchSeats(id));
      } catch {
        setError("Could not load seats. Is the backend running?");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const toggleSeat = (seatId) => {
    setSelected((prev) =>
      prev.includes(seatId) ? prev.filter((s) => s !== seatId) : [...prev, seatId]
    );
  };

  const confirmBooking = async () => {
    setSaving(true);
    setError("");
    try {
      const booking = await createBooking({
        eventId: id,
        eventName: event.name,
        seats: selected,
        total: selected.length * event.price,
      });
      navigate(`/confirmation/${booking.id}`);
    } catch (err) {
      setError(
        err.response?.status === 409
          ? "Some seats were just taken by someone else. Please choose again."
          : "Booking failed. Please try again."
      );
      setSelected([]);
      try {
        setSeats(await fetchSeats(id));
      } catch {
        // ignore, the error message above is already shown
      }
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: "16px" }}>Loading...</p>;
  if (!event) return <p style={{ padding: "16px", color: "#c62828" }}>{error || "Event not found."}</p>;

  return (
    <div style={{ padding: "16px" }}>
      <h2>{event.name}</h2>
      <p>{event.venue} | {event.date} at {event.time}</p>

      <p style={{ textAlign: "center", background: "#ddd", padding: "6px", maxWidth: "540px" }}>
        SCREEN / STAGE
      </p>

      <SeatGrid seats={seats} selected={selected} onToggle={toggleSeat} />

      <p>
        <span style={{ background: "#e0e0e0", padding: "2px 10px" }}> </span> Available{" "}
        <span style={{ background: "#4caf50", padding: "2px 10px" }}> </span> Selected{" "}
        <span style={{ background: "#888", padding: "2px 10px" }}> </span> Booked
      </p>

      <h3>Selected seats: {selected.length ? selected.join(", ") : "None"}</h3>
      <h3>Total: ₹{selected.length * event.price}</h3>
      {error && <p style={{ color: "#c62828" }}>{error}</p>}
      <button disabled={selected.length === 0 || saving} onClick={confirmBooking}>
        {saving ? "Booking..." : "Confirm Booking"}
      </button>
    </div>
  );
}