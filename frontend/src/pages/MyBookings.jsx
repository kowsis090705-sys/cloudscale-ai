
import { useState, useEffect } from "react";
import { fetchBookings, removeBooking } from "../api/client";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const load = async () => {
    try {
      const data = await fetchBookings();
      setBookings(data);
      setError("");
    } catch {
      setError("Could not load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this ticket?")) return;

    setCancellingId(id);

    try {
      await removeBooking(id);
      await load();
    } catch {
      setError("Cannot cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED"
  );

  const totalTickets = confirmedBookings.length;

  const totalAmount = confirmedBookings.reduce(
    (sum, booking) => sum + Number(booking.total || 0),
    0
  );

  const cardStyle = {
    background: "#18243d",
    border: "1px solid #354563",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    color: "#f8faff",
  };

  return (
    <main style={{ padding: 20, color: "#f8faff" }}>
      <h2>My Bookings</h2>

      {loading && <p>Loading bookings...</p>}

      {error && (
        <p style={{ color: "#ff7070" }}>{error}</p>
      )}

      {!loading && (
        <>
          <section style={cardStyle}>
            <h3>Booking Summary</h3>

            <p>
              <strong>Total Confirmed Tickets:</strong>{" "}
              {totalTickets}
            </p>

            <h3>
              Total Amount: ₹
              {totalAmount.toLocaleString("en-IN")}
            </h3>
          </section>

          {bookings.length === 0 && (
            <p>No bookings yet.</p>
          )}

          {bookings.map((booking) => (
            <section key={booking.id} style={cardStyle}>
              <h3>{booking.eventName}</h3>

              <p>
                <strong>Booking ID:</strong> {booking.id}
              </p>

              <p>
                <strong>Seat:</strong>{" "}
                {booking.seats.join(", ")}
              </p>

              <p>
                <strong>Ticket Price:</strong> ₹
                {Number(booking.total || 0).toLocaleString(
                  "en-IN"
                )}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color:
                      booking.status === "CONFIRMED"
                        ? "#81c784"
                        : "#ffb74d",
                  }}
                >
                  {booking.status}
                </span>
              </p>

              {booking.status !== "CANCELLED" && (
                <button
                  disabled={cancellingId === booking.id}
                  onClick={() => cancel(booking.id)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#c62828",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {cancellingId === booking.id
                    ? "Cancelling..."
                    : "Cancel Ticket"}
                </button>
              )}
            </section>
          ))}
        </>
      )}
    </main>
  );
}
