import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchBooking } from "../api/client";

export default function Confirmation() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooking(bookingId)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <p style={{ padding: "16px" }}>Loading...</p>;
  if (!booking) return <h2 style={{ padding: "16px" }}>Booking not found</h2>;

  return (
    <div style={{ padding: "16px" }}>
      <h2 style={{ color: "#2e7d32" }}>Booking Confirmed!</h2>
      <p><b>Booking ID:</b> {booking.id}</p>
      <p><b>Event:</b> {booking.eventName}</p>
      <p><b>Seats:</b> {booking.seats.join(", ")}</p>
      <p><b>Total paid:</b> ₹{booking.total}</p>
      <p><b>Booked at:</b> {booking.bookedAt}</p>
      <Link to="/my-bookings">View My Bookings</Link>
    </div>
  );
}