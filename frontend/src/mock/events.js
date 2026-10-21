const KEY = "events";

const defaults = [
  { id: 1, name: "Leo - First Day First Show", type: "Movie", venue: "PVR Cinemas, Trichy", date: "2026-11-02", time: "10:00 AM", price: 200, totalSeats: 60, seatsLeft: 60 },
  { id: 2, name: "Arijit Singh Live", type: "Concert", venue: "YMCA Grounds, Chennai", date: "2026-11-15", time: "7:00 PM", price: 1500, totalSeats: 60, seatsLeft: 60 },
  { id: 3, name: "CSK vs MI", type: "Match", venue: "Chepauk Stadium, Chennai", date: "2026-11-20", time: "7:30 PM", price: 2500, totalSeats: 60, seatsLeft: 60 },
  { id: 4, name: "Stand-up Comedy Night", type: "Show", venue: "Phoenix Mall, Chennai", date: "2026-11-25", time: "8:00 PM", price: 600, totalSeats: 60, seatsLeft: 60 },
];

export function getEvents() {
  const saved = localStorage.getItem(KEY);
  if (!saved) {
    localStorage.setItem(KEY, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(saved);
}

export function addEvent(data) {
  const event = { ...data, id: Date.now(), seatsLeft: data.totalSeats };
  localStorage.setItem(KEY, JSON.stringify([...getEvents(), event]));
  return event;
}

export function deleteEvent(id) {
  const rest = getEvents().filter((e) => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(rest));
}