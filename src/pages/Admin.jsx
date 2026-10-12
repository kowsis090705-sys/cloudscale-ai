import { useState, useEffect } from "react";
import { fetchEvents, createEvent, removeEvent } from "../api/client";

const emptyForm = {
  name: "",
  type: "Movie",
  venue: "",
  date: "",
  time: "",
  price: "",
  totalSeats: "",
};

export default function Admin() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch(() => setMessage("Could not load events. Is the backend running?"));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async () => {
    if (!form.name || !form.venue || !form.date || !form.time || !form.price || !form.totalSeats) {
      setMessage("Please fill all the fields.");
      return;
    }
    const seats = Number(form.totalSeats);
    if (seats < 10 || seats > 200) {
      setMessage("Seat count must be between 10 and 200.");
      return;
    }
    try {
      await createEvent({ ...form, price: Number(form.price), totalSeats: seats });
      setEvents(await fetchEvents());
      setForm(emptyForm);
      setMessage("Event added successfully.");
    } catch {
      setMessage("Could not add the event. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeEvent(id);
      setEvents(await fetchEvents());
    } catch {
      setMessage("Could not delete the event. Please try again.");
    }
  };

  const input = { display: "block", marginBottom: "10px", padding: "6px", width: "280px" };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Admin: Add Event</h2>

      <input style={input} name="name" placeholder="Event name" value={form.name} onChange={handleChange} />
      <select style={input} name="type" value={form.type} onChange={handleChange}>
        <option>Movie</option>
        <option>Concert</option>
        <option>Match</option>
        <option>Show</option>
      </select>
      <input style={input} name="venue" placeholder="Venue" value={form.venue} onChange={handleChange} />
      <input style={input} name="date" type="date" value={form.date} onChange={handleChange} />
      <input style={input} name="time" placeholder="Time (e.g. 7:00 PM)" value={form.time} onChange={handleChange} />
      <input style={input} name="price" type="number" placeholder="Ticket price" value={form.price} onChange={handleChange} />
      <input style={input} name="totalSeats" type="number" placeholder="Total seats (10 to 200)" value={form.totalSeats} onChange={handleChange} />

      <button onClick={handleAdd}>Add Event</button>
      {message && <p>{message}</p>}

      <h2 style={{ marginTop: "30px" }}>All Events</h2>
      {events.map((e) => (
        <div
          key={e.id}
          style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "10px", marginBottom: "10px", maxWidth: "400px" }}
        >
          <b>{e.name}</b> ({e.type})
          <p style={{ margin: "4px 0" }}>{e.venue} | {e.date} at {e.time}</p>
          <p style={{ margin: "4px 0" }}>₹{e.price} | {e.totalSeats} seats</p>
          <button onClick={() => handleDelete(e.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}