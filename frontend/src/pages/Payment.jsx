
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createMultipleBooking } from "../api/client";

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();

  const event = location.state?.event;
  const selectedSeats = location.state?.selectedSeats || [];

  const [method, setMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);

  const price = Number(event?.price || 0);
  const total = selectedSeats.length * price;

  const cardStyle = {
    background: "#18243d",
    border: "1px solid #354563",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "20px",
    color: "#f8faff",
  };

  async function handlePayment() {
    if (processing || !event || selectedSeats.length === 0) return;

    setProcessing(true);
    setError("");

    try {
      // Simulated payment only; no real transaction.
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (simulateFailure) {
        setError("Demo payment failed. Please try again.");
        return;
      }

      // Book seats only after demo payment succeeds.
      const bookings = await createMultipleBooking({
        seats: selectedSeats.map((seat) => seat.id),
      });

      if (!Array.isArray(bookings) || bookings.length === 0) {
        throw new Error("Booking confirmation not received.");
      }

      navigate("/my-bookings", { replace: true });
    } catch (err) {
      setError(
        err.response?.status === 409
          ? "One or more seats are no longer available. Go back and select other seats."
          : err.message || "Unable to confirm booking."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (!event || selectedSeats.length === 0) {
    return (
      <main style={{ padding: 24, color: "#f8faff" }}>
        <h2>Payment Session Not Found</h2>
        <p>Please select your tickets again.</p>
        <button onClick={() => navigate("/events")}>
          Back to Events
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 680,
        margin: "30px auto",
        padding: 20,
        color: "#f8faff",
      }}
    >
      <h2>Secure Demo Checkout</h2>
      <p style={{ color: "#b9c5e2" }}>
        College project demonstration. No actual payment is collected.
      </p>

      <section style={cardStyle}>
        <h3>Order Summary</h3>
        <p><strong>Event:</strong> {event.name}</p>
        <p>
          <strong>Seats:</strong>{" "}
          {selectedSeats.map((seat) => seat.seatNo || seat.number).join(", ")}
        </p>
        <p><strong>Tickets:</strong> {selectedSeats.length}</p>
        <p>
          <strong>Price per Ticket:</strong> ₹
          {price.toLocaleString("en-IN")}
        </p>
        <h2>Total: ₹{total.toLocaleString("en-IN")}</h2>
      </section>

      <section style={cardStyle}>
        <h3>Select Payment Method</h3>

        {[
          ["upi", "UPI (Demo)"],
          ["card", "Debit / Credit Card (Demo)"],
          ["netbanking", "Net Banking (Demo)"],
        ].map(([value, label]) => (
          <label
            key={value}
            style={{
              display: "block",
              marginBottom: 16,
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={value}
              checked={method === value}
              onChange={() => setMethod(value)}
            />{" "}
            {label}
          </label>
        ))}

        <label
          style={{
            display: "block",
            margin: "20px 0",
            color: "#ffb74d",
          }}
        >
          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(e) => setSimulateFailure(e.target.checked)}
          />{" "}
          Simulate payment failure (testing)
        </label>

        {error && (
          <p role="alert" style={{ color: "#ff7070" }}>
            {error}
          </p>
        )}

        <button
          onClick={handlePayment}
          disabled={processing}
          style={{
            padding: "12px 24px",
            background: processing ? "#59647c" : "#5278e9",
            border: "none",
            borderRadius: 8,
            color: "white",
            cursor: processing ? "not-allowed" : "pointer",
          }}
        >
          {processing
            ? "Processing..."
            : `Demo Pay ₹${total.toLocaleString("en-IN")}`}
        </button>
      </section>
    </main>
  );
}
