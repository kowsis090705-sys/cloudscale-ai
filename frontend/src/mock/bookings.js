const KEY = "bookings";

export function getBookings() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function addBooking({ eventId, eventName, seats, total }) {
  const booking = {
    id: "BK" + Date.now(),
    eventId: Number(eventId),
    eventName,
    seats,
    total,
    bookedAt: new Date().toLocaleString(),
  };
  localStorage.setItem(KEY, JSON.stringify([...getBookings(), booking]));
  return booking;
}

export function cancelBooking(id) {
  const rest = getBookings().filter((b) => b.id !== id);
  localStorage.setItem(KEY, JSON.stringify(rest));
}

export function getBookedSeatIds(eventId) {
  return getBookings()
    .filter((b) => b.eventId === Number(eventId))
    .flatMap((b) => b.seats);
}