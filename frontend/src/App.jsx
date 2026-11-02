
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Events from "./pages/Events";
import MyBookings from "./pages/MyBookings";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import SeatSelection from "./pages/SeatSelection";
import Confirmation from "./pages/Confirmation";
import Payment from "./pages/Payment";

import "./index.css";

export default function App() {
  return (
    <>
      <Navbar />

      <div className="app-content">
        <Routes>
          {/* Home - Upcoming Events */}
          <Route path="/" element={<Events />} />

          {/* My Bookings */}
          <Route
            path="/my-bookings"
            element={<MyBookings />}
          />

          {/* Admin Page */}
          <Route path="/admin" element={<Admin />} />

          {/* CloudScale AI Dashboard */}
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Event Seat Selection */}
          <Route
            path="/events/:id/seats"
            element={<SeatSelection />}
          />

          {/* NEW: Demo Payment Page */}
          <Route
            path="/payment"
            element={<Payment />}
          />

          {/* Booking Confirmation */}
          <Route
            path="/confirmation/:bookingId"
            element={<Confirmation />}
          />
        </Routes>
      </div>
    </>
  );
}
