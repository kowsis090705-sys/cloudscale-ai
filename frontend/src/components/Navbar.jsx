import {NavLink} from "react-router-dom";
export default function Navbar(){return <nav className="top-nav"><NavLink className="brand" to="/">CloudScale <span>AI</span></NavLink><NavLink to="/" end>Events</NavLink><NavLink to="/my-bookings">My Bookings</NavLink><NavLink to="/admin">Admin</NavLink><NavLink to="/dashboard">Dashboard</NavLink></nav>}
