import { useState, useEffect } from "react";
import { fetchBookings, removeBooking } from "../api/client";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBookings()
      .then(setBookings)
      .catch(() => setError("Could not load bookings. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    try {
      await removeBooking(id);
      setBookings(await fetchBookings());
    } catch {
      setError("Could not cancel the booking. Please try again.");
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>My Bookings</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#c62828" }}>{error}</p>}
      {!loading && !error && bookings.length === 0 && <p>No bookings yet.</p>}
      {bookings.map((b) => (
        <div
          key={b.id}
          style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "12px", marginBottom: "12px", maxWidth: "400px" }}
        >
          <h3 style={{ margin: "0 0 6px" }}>{b.eventName}</h3>
          <p style={{ margin: "4px 0" }}>ID: {b.id}</p>
          <p style={{ margin: "4px 0" }}>Seats: {b.seats.join(", ")}</p>
          <p style={{ margin: "4px 0" }}>Total: ₹{b.total}</p>
          <button onClick={() => handleCancel(b.id)}>Cancel Booking</button>
        </div>
      ))}
    </div>
  );
}