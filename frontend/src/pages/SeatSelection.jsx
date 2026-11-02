
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEvent, fetchSeats } from "../api/client";
import SeatGrid from "../components/SeatGrid";

export default function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setSelected([]);

        const eventData = await fetchEvent(id);
        if (!eventData) {
          throw new Error("Event not found");
        }

        const seatData = await fetchSeats(id);

        if (mounted) {
          setEvent(eventData);
          setSeats(seatData);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load seats");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [id]);

  function toggleSeat(seatId) {
    const seat = seats.find((s) => s.id === seatId);

    if (!seat || seat.booked || seat.status !== "AVAILABLE") {
      return;
    }

    setSelected((previous) =>
      previous.includes(seatId)
        ? previous.filter((value) => value !== seatId)
        : [...previous, seatId]
    );
  }

  function proceedToPayment() {
    if (!event || selected.length === 0) {
      setError("Please select at least one seat");
      return;
    }

    const selectedSeats = selected
      .map((seatId) => seats.find((seat) => seat.id === seatId))
      .filter(Boolean);

    if (selectedSeats.length !== selected.length) {
      setError("Please refresh and select seats again");
      return;
    }

    navigate("/payment", {
      state: {
        event,
        selectedSeats,
      },
    });
  }

  if (loading) {
    return <p style={{ padding: 20 }}>Loading seats...</p>;
  }

  if (!event) {
    return (
      <p style={{ padding: 20, color: "#ff7070" }}>
        {error || "Event not found"}
      </p>
    );
  }

  const price = Number(event.price || 0);
  const total = selected.length * price;

  const selectedLabels = selected.map((seatId) => {
    const seat = seats.find((s) => s.id === seatId);
    return seat?.seatNo || seat?.number || seatId;
  });

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "25px auto",
        padding: 20,
        color: "#f8faff",
      }}
    >
      <h2>{event.name}</h2>

      <p style={{ color: "#bac8e4" }}>
        {event.venue} | {event.date} {event.time}
      </p>

      <h3>Select Your Seats</h3>

      <p>You can select multiple available seats.</p>

      <div
        style={{
          background: "#33446b",
          padding: 12,
          textAlign: "center",
          borderRadius: 8,
          marginBottom: 25,
          fontWeight: "bold",
        }}
      >
        STAGE
      </div>

      <SeatGrid
        seats={seats}
        selected={selected}
        onToggle={toggleSeat}
      />

      <section
        style={{
          background: "#18243d",
          border: "1px solid #354563",
          padding: 22,
          marginTop: 25,
          borderRadius: 12,
        }}
      >
        <h3>Booking Summary</h3>

        <p>
          <strong>Selected Seats:</strong>{" "}
          {selectedLabels.length
            ? selectedLabels.join(", ")
            : "None"}
        </p>

        <p>
          <strong>Number of Tickets:</strong>{" "}
          {selected.length}
        </p>

        <p>
          <strong>Price per Ticket:</strong> ₹
          {price.toLocaleString("en-IN")}
        </p>

        <h2 style={{ color: "#79e0aa" }}>
          Total: ₹{total.toLocaleString("en-IN")}
        </h2>

        {error && (
          <p role="alert" style={{ color: "#ff7070" }}>
            {error}
          </p>
        )}

        <button
          onClick={proceedToPayment}
          disabled={selected.length === 0}
          style={{
            padding: "14px 26px",
            background:
              selected.length === 0 ? "#59647c" : "#5278e9",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor:
              selected.length === 0 ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: 15,
          }}
        >
          Proceed to Payment
        </button>
      </section>
    </main>
  );
}
