import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Events from "./pages/Events";
import MyBookings from "./pages/MyBookings";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import SeatSelection from "./pages/SeatSelection";
import Confirmation from "./pages/Confirmation";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Events />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events/:id/seats" element={<SeatSelection />} />
        <Route path="/confirmation/:bookingId" element={<Confirmation />} />
      </Routes>
    </>
  );
}