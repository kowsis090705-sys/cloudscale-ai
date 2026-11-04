
import axios from "axios";

const USER_ID = Number(import.meta.env.VITE_DEMO_USER_ID || 1);

const http = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

// Convert backend event data for frontend
const toEvent = (e) => {
  const at = e.showTime || "";

  return {
    ...e,
    name: e.title,
    date: at.slice(0, 10),
    time: at.slice(11, 16),
    price: Number(e.price || 0),
    seatsLeft: e.seatsLeft ?? e.totalSeats,
  };
};

// Convert backend seat data for frontend
const toSeat = (s) => {
  const match = String(s.seatNo || "").match(/^(.*?)(\d+)$/);
  const num = match ? Number(match[2]) : s.id;

  return {
    ...s,
    number: s.seatNo,
    row: String.fromCharCode(65 + Math.floor((num - 1) / 10)),
    booked: s.status !== "AVAILABLE",
  };
};

// Convert booking data for frontend
const toBooking = (b) => ({
  ...b,
  seats: [b.seatNo || String(b.seatId)],
  eventName: b.eventName || `Event #${b.eventId}`,
  total: Number(b.total || 0),
  bookedAt: b.createdAt || "",
});

// Fetch all events
export async function fetchEvents() {
  const response = await http.get("/events");
  return response.data.map(toEvent);
}

// Fetch event by ID
export async function fetchEvent(id) {
  const events = await fetchEvents();
  return events.find((e) => String(e.id) === String(id));
}

// Create event
export async function createEvent(data) {
  const showTime =
    data.date +
    "T" +
    (/^\d{2}:\d{2}$/.test(data.time)
      ? data.time
      : parseTime(data.time)) +
    ":00";

  const response = await http.post("/admin/events", {
    title: data.name,
    type: data.type,
    venue: data.venue,
    showTime,
    totalSeats: Number(data.totalSeats),
    price: Number(data.price),
  });

  return toEvent(response.data);
}

// Convert time
function parseTime(value) {
  const m = String(value).match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!m) {
    throw new Error("Use time HH:mm or h:mm AM/PM");
  }

  return (
    String(
      (Number(m[1]) % 12) +
        (m[3].toUpperCase() === "PM" ? 12 : 0)
    ).padStart(2, "0") +
    ":" +
    m[2]
  );
}

// Delete event
export async function removeEvent(id) {
  await http.delete(`/admin/events/${id}`);
}

// Fetch available and booked seats
export async function fetchSeats(id) {
  const response = await http.get(`/events/${id}/seats`);
  return response.data.map(toSeat);
}

// Existing single-ticket booking
export async function createBooking({ seats }) {
  if (!Array.isArray(seats) || seats.length !== 1) {
    throw new Error(
      "Please select exactly one seat per booking."
    );
  }

  const response = await http.post("/bookings", {
    userId: USER_ID,
    seatId: Number(seats[0]),
  });

  return toBooking(response.data);
}

// NEW: Multiple-ticket booking
export async function createMultipleBooking({ seats }) {
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new Error("Please select at least one seat.");
  }

  const seatIds = seats.map(Number);

  if (
    seatIds.some(
      (id) => !Number.isInteger(id) || id <= 0
    )
  ) {
    throw new Error("Invalid seat selection.");
  }

  if (new Set(seatIds).size !== seatIds.length) {
    throw new Error("Duplicate seats selected.");
  }

  // Send all selected seats in one request
  const response = await http.post("/bookings/multiple", {
    userId: USER_ID,
    seatIds,
  });

  // Backend returns one booking record per selected seat
  return response.data.map(toBooking);
}

// Fetch bookings for current user
export async function fetchBookings() {
  const response = await http.get(
    `/bookings/user/${USER_ID}`
  );

  return response.data.map(toBooking);
}

// Fetch booking by ID
export async function fetchBooking(id) {
  const response = await http.get(`/bookings/${id}`);
  return toBooking(response.data);
}

// Cancel booking and return updated booking details
export async function removeBooking(id) {
  const response = await http.delete(`/bookings/${id}`);
  return toBooking(response.data);
}
