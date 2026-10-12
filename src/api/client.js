import axios from "axios";
import * as mockEvents from "../mock/events";
import { getSeats as mockSeats } from "../mock/seats";
import * as mockBookings from "../mock/bookings";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const USER_ID = 1;

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
});

// ---------- Events ----------
export async function fetchEvents() {
  if (USE_MOCK) return mockEvents.getEvents();
  return (await http.get("/events")).data;
}

export async function fetchEvent(id) {
  const all = await fetchEvents();
  return all.find((e) => String(e.id) === String(id));
}

export async function createEvent(data) {
  if (USE_MOCK) return mockEvents.addEvent(data);
  return (await http.post("/events", data)).data;
}

export async function removeEvent(id) {
  if (USE_MOCK) return mockEvents.deleteEvent(id);
  await http.delete(`/events/${id}`);
}

// ---------- Seats ----------
export async function fetchSeats(eventId) {
  if (USE_MOCK) {
    const event = await fetchEvent(eventId);
    const taken = mockBookings.getBookedSeatIds(eventId);
    return mockSeats(eventId, event.totalSeats).map((s) => ({
      ...s,
      booked: s.booked || taken.includes(s.id),
    }));
  }
  return (await http.get(`/events/${eventId}/seats`)).data;
}

// ---------- Bookings ----------
export async function createBooking({ eventId, eventName, seats, total }) {
  if (USE_MOCK) return mockBookings.addBooking({ eventId, eventName, seats, total });
  return (await http.post("/bookings", { eventId: Number(eventId), seats, userId: USER_ID })).data;
}

export async function fetchBookings() {
  if (USE_MOCK) return mockBookings.getBookings();
  return (await http.get("/bookings", { params: { userId: USER_ID } })).data;
}

export async function fetchBooking(id) {
  if (USE_MOCK) return mockBookings.getBookings().find((b) => b.id === id);
  return (await http.get(`/bookings/${id}`)).data;
}

export async function removeBooking(id) {
  if (USE_MOCK) return mockBookings.cancelBooking(id);
  await http.delete(`/bookings/${id}`);
}