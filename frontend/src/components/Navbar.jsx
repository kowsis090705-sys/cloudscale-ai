import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav style={{ display: "flex", gap: "20px", padding: "12px" }}>
      <Link to="/">Events</Link>
      <Link to="/my-bookings">My Bookings</Link>
      <Link to="/admin">Admin</Link>
      <Link to="/dashboard">Dashboard</Link>
    </nav>
  );
}