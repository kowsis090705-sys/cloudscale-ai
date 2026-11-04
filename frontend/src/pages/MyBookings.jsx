
import { useState, useEffect } from "react";
import { fetchBookings, removeBooking } from "../api/client";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [pendingIds, setPendingIds] = useState([]);

  const load = async () => {
    try {
      const data = await fetchBookings();

      setBookings(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError("Could not load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id) => {
    if (cancellingId !== null || pendingIds.includes(id)) {
      return;
    }

    const confirmed = window.confirm(
      "Cancel this ticket and request a Razorpay refund? " +
      "Refund processing may take time."
    );

    if (!confirmed) return;

    setCancellingId(id);
    setError("");
    setMessage("");

    try {
      const result = await removeBooking(id);

      // A confirmed booking in the response can mean
      // the refund has started but is still pending.
      if (result?.status === "CANCELLED") {
        setMessage(
          `Booking #${id} cancelled successfully. ` +
          "Check Razorpay refund status for payment details."
        );
      } else {
        setPendingIds((previous) =>
          previous.includes(id) ? previous : [...previous, id]
        );

        setMessage(
          `Refund request for booking #${id} has been submitted. ` +
          "Cancellation is not finalized yet. " +
          "Do not submit another refund request."
        );
      }

      await load();
    } catch (err) {
      setError(
        `Could not complete cancellation for booking #${id}. ` +
        "The refund outcome may need verification. " +
        "Do not retry until the status is checked."
      );

      // Avoid repeated attempts after an uncertain response.
      setPendingIds((previous) =>
        previous.includes(id) ? previous : [...previous, id]
      );
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

  const buttonStyle = {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    background: "#c62828",
    color: "white",
    cursor: "pointer",
  };

  return (
    <main
      style={{
        padding: 20,
        color: "#f8faff",
      }}
    >
      <h2>My Bookings</h2>

      {loading && <p>Loading bookings...</p>}

      {error && (
        <p role="alert" style={{ color: "#ff7070" }}>
          {error}
        </p>
      )}

      {message && (
        <p role="status" style={{ color: "#81c784" }}>
          {message}
        </p>
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

          {bookings.map((booking) => {
            const pendingLocally =
              pendingIds.includes(booking.id);

            const refundStatus =
              booking.refundStatus ||
              booking.refund_status ||
              "";

            const refundInProgress =
              pendingLocally ||
              [
                "REQUESTING",
                "PENDING",
                "CREATED",
                "REVIEW_REQUIRED",
              ].includes(refundStatus);

            const seats = Array.isArray(booking.seats)
              ? booking.seats.join(", ")
              : booking.seatNo ||
                booking.seatId ||
                "Not available";

            return (
              <section
                key={booking.id}
                style={cardStyle}
              >
                <h3>{booking.eventName}</h3>

                <p>
                  <strong>Booking ID:</strong>{" "}
                  {booking.id}
                </p>

                <p>
                  <strong>Seat:</strong> {seats}
                </p>

                <p>
                  <strong>Ticket Price:</strong> ₹
                  {Number(
                    booking.total || 0
                  ).toLocaleString("en-IN")}
                </p>

                <p>
                  <strong>Booking Status:</strong>{" "}
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

                {refundStatus && (
                  <p>
                    <strong>Refund Status:</strong>{" "}
                    <span
                      style={{
                        color:
                          refundStatus === "PROCESSED"
                            ? "#81c784"
                            : "#ffb74d",
                      }}
                    >
                      {refundStatus}
                    </span>
                  </p>
                )}

                {booking.status === "CONFIRMED" &&
                  (refundInProgress ? (
                    <p style={{ color: "#ffb74d" }}>
                      Refund pending or requires review.
                      Please do not request it again.
                    </p>
                  ) : (
                    <button
                      disabled={cancellingId !== null}
                      onClick={() =>
                        cancel(booking.id)
                      }
                      style={buttonStyle}
                    >
                      {cancellingId === booking.id
                        ? "Processing Refund..."
                        : "Cancel Ticket & Request Refund"}
                    </button>
                  ))}

                {booking.status === "CANCELLED" && (
                  <p style={{ color: "#81c784" }}>
                    Ticket cancelled
                  </p>
                )}
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
