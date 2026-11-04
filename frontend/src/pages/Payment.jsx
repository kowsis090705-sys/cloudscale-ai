import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = "/api";

// Demo user ID - replace with authenticated user ID later
const DEMO_USER_ID = 1;

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.detail ||
      `Request failed: HTTP ${response.status}`
    );
  }

  return data;
}

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();

  const event = location.state?.event;
  const selectedSeats = location.state?.selectedSeats || [];

  const [processing, setProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

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
    if (processing || !event || selectedSeats.length === 0) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Load Razorpay Checkout
      const loaded = await loadRazorpayScript();

      if (!loaded) {
        throw new Error("Unable to load Razorpay Checkout.");
      }

      // Create order through Spring Boot backend
      const order = await postJson("/payments/create-order", {
        userId: DEMO_USER_ID,
        seatIds: selectedSeats.map((seat) => seat.id),
      });

      if (!order.orderId || !order.keyId) {
        throw new Error("Invalid Razorpay order response.");
      }

      if (!order.keyId.startsWith("rzp_test_")) {
        throw new Error("Only Razorpay Test Mode is allowed.");
      }

      // Configure Razorpay checkout
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "CloudScale AI",
        description: `${event.title || event.name || "Event"} Tickets`,
        order_id: order.orderId,

        theme: {
          color: "#5278e9",
        },

        // Razorpay payment success callback
        handler: async function (response) {
          setVerifying(true);
          setError("");

          try {
            // Send payment proof to backend
            const result = await postJson("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (
              result.status !== "CONFIRMED" ||
              !Array.isArray(result.bookingIds) ||
              result.bookingIds.length !== selectedSeats.length
            ) {
              throw new Error("Ticket confirmation is incomplete.");
            }

            // Navigate only after backend confirms tickets
            navigate("/my-bookings", {
              replace: true,
            });
          } catch (err) {
            setError(
              "Payment may have succeeded, but ticket confirmation " +
              "could not be completed. Do not pay again. " +
              `Payment ID: ${response.razorpay_payment_id}. ` +
              (err.message || "")
            );
          } finally {
            setVerifying(false);
            setProcessing(false);
          }
        },

        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        setError(
          response.error?.description ||
          "Test payment failed. Please try again."
        );
        setProcessing(false);
      });

      razorpay.open();
    } catch (err) {
      setError(err.message || "Unable to start payment.");
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
      <h2>Secure Razorpay Test Checkout</h2>

      <p style={{ color: "#b9c5e2" }}>
        College project demonstration using Razorpay Test Mode.
        No real money will be deducted.
      </p>

      <section style={cardStyle}>
        <h3>Order Summary</h3>

        <p>
          <strong>Event:</strong>{" "}
          {event.title || event.name}
        </p>

        <p>
          <strong>Seats:</strong>{" "}
          {selectedSeats
            .map((seat) => seat.seatNo || seat.number || seat.id)
            .join(", ")}
        </p>

        <p>
          <strong>Tickets:</strong> {selectedSeats.length}
        </p>

        <p>
          <strong>Price per Ticket:</strong> ₹
          {price.toLocaleString("en-IN")}
        </p>

        <h2>
          Total: ₹{total.toLocaleString("en-IN")}
        </h2>
      </section>

      <section style={cardStyle}>
        <h3>Payment Method</h3>

        <p style={{ color: "#b9c5e2" }}>
          UPI, Card and Net Banking options are available
          inside Razorpay Checkout, subject to Test Mode
          availability.
        </p>

        {error && (
          <p role="alert" style={{ color: "#ff7070" }}>
            {error}
          </p>
        )}

        {verifying && (
          <p style={{ color: "#8dd8ff" }}>
            Verifying payment and confirming tickets...
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
            fontWeight: "bold",
            cursor: processing ? "not-allowed" : "pointer",
          }}
        >
          {verifying
            ? "Confirming Tickets..."
            : processing
            ? "Processing..."
            : `Pay ₹${total.toLocaleString("en-IN")} with Razorpay`}
        </button>

        <p
          style={{
            fontSize: 12,
            color: "#b9c5e2",
            marginTop: 16,
          }}
        >
          Test Mode only. Tickets are confirmed after
          successful backend payment verification.
        </p>
      </section>
    </main>
  );
}
