import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEvent, fetchSeats, createBooking } from "../api/client";
import SeatGrid from "../components/SeatGrid";
export default function SeatSelection() {
 const { id }=useParams(); const navigate=useNavigate();
 const [event,setEvent]=useState(null),[seats,setSeats]=useState([]),[selected,setSelected]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");
 useEffect(()=>{let mounted=true;(async()=>{try{const e=await fetchEvent(id);if(!e)throw new Error("Event not found");const s=await fetchSeats(id);if(mounted){setEvent(e);setSeats(s)}}catch(e){if(mounted)setError(e.message || "Failed to load seats")}finally{if(mounted)setLoading(false)}})();return()=>{mounted=false}},[id]);
 async function confirm(){setSaving(true);setError("");try{const b=await createBooking({seats:selected});navigate("/confirmation/"+b.id)}catch(e){setError(e.response?.status===409?"Seat already booked; choose another.":e.message||"Booking failed");setSelected([]);try{setSeats(await fetchSeats(id))}catch{}}finally{setSaving(false)}}
 if(loading)return <p>Loading...</p>;if(!event)return <p>{error||"Event not found"}</p>;
 return <main style={{padding:16}}><h2>{event.name}</h2><p>{event.venue} | {event.date} {event.time}</p><p>Select one seat per booking.</p><p style={{background:"#ddd",padding:8,textAlign:"center",maxWidth:540}}>STAGE</p><SeatGrid seats={seats} selected={selected} onToggle={seatId=>setSelected(p=>p.includes(seatId)?[]:[seatId])}/><p>Selected: {selected.length?seats.find(s=>s.id===selected[0])?.seatNo:"None"}</p><p>Ticket price: ₹{event.price}</p>{error&&<p style={{color:"crimson"}}>{error}</p>}<button disabled={!selected.length||saving} onClick={confirm}>{saving?"Booking...":"Confirm Booking"}</button></main>;
}