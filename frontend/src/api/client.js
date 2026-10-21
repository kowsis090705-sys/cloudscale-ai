import axios from "axios";
const USER_ID = Number(import.meta.env.VITE_DEMO_USER_ID || 1);
const http = axios.create({ baseURL: "/api", timeout: 10000 });
const toEvent = e => {
  const at = e.showTime || "";
  return { ...e, name: e.title, date: at.slice(0,10), time: at.slice(11,16), price: Number(e.price || 0), seatsLeft: e.seatsLeft ?? e.totalSeats };
};
const toSeat = s => {
  const match = String(s.seatNo || "").match(/^(.*?)(\d+)$/);
  const num = match ? Number(match[2]) : s.id;
  return { ...s, number: s.seatNo, row: String.fromCharCode(65 + Math.floor((num-1)/10)), booked: s.status !== "AVAILABLE" };
};
const toBooking = b => ({ ...b, seats: [b.seatNo || String(b.seatId)], eventName: b.eventName || ("Event #" + b.eventId), total: Number(b.total || 0), bookedAt: b.createdAt || "" });
export async function fetchEvents() { return (await http.get("/events")).data.map(toEvent); }
export async function fetchEvent(id) { return (await fetchEvents()).find(e => String(e.id) === String(id)); }
export async function createEvent(data) {
  const showTime = data.date + "T" + (/^\d{2}:\d{2}$/.test(data.time) ? data.time : parseTime(data.time)) + ":00";
  return toEvent((await http.post("/admin/events", {title:data.name,type:data.type,venue:data.venue,showTime,totalSeats:Number(data.totalSeats),price:Number(data.price)})).data);
}
function parseTime(value) {
  const m = String(value).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) throw new Error("Use time HH:mm or h:mm AM/PM");
  return String((Number(m[1])%12)+(m[3].toUpperCase()==="PM"?12:0)).padStart(2,"0")+":"+m[2];
}
export async function removeEvent(id) { await http.delete("/admin/events/" + id); }
export async function fetchSeats(id) { return (await http.get("/events/" + id + "/seats")).data.map(toSeat); }
export async function createBooking({ seats }) {
  if (seats.length !== 1) throw new Error("Please select exactly one seat per booking.");
  return toBooking((await http.post("/bookings",{userId:USER_ID,seatId:Number(seats[0])})).data);
}
export async function fetchBookings() { return (await http.get("/bookings/user/" + USER_ID)).data.map(toBooking); }
export async function fetchBooking(id) { return toBooking((await http.get("/bookings/" + id)).data); }
export async function removeBooking(id) { await http.delete("/bookings/" + id); }
