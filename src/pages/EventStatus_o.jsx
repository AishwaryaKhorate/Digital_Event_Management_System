import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import "./EventStatus_o.css";
import { useNavigate } from "react-router-dom";

export default function EventStatus() {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // --- SINGLE CONSOLIDATED DATA FETCHING ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const eventsRef = collection(db, "events");
        const q = query(
          eventsRef,
          where("organizerId", "==", user.uid),
         orderBy("createdAt", "desc")
        );

        const unsubscribeSnap = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setEvents(data);
          setLoading(false); 
        }, (error) => {
          console.error("Firestore Error:", error);
          setLoading(false);
        });

        return () => unsubscribeSnap();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // --- FILTERING LOGIC ---
 // --- UPDATED FILTERING LOGIC ---
  useEffect(() => {
    const now = new Date();

    // Transform data: Check if date/time has passed
    let data = events.map(event => {
      const eventDateTime = new Date(`${event.date}T${event.time}`);
      
      // If time passed and not rejected, force status to "completed"
      if (eventDateTime < now && event.status !== "rejected") {
        return { ...event, status: "completed" };
      }
      return event;
    });

    // Apply existing filters to the transformed data
    if (search) {
      data = data.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()));
    }
    if (category) {
      data = data.filter(e => e.category === category);
    }
    if (paymentType) {
      data = data.filter(e => e.paymentType === paymentType);
    }
    if (statusTab !== "all") {
      data = data.filter(e => e.status === statusTab);
    }

    setFilteredEvents(data);
  }, [search, category, paymentType, statusTab, events]);
  
  // --- SAFETY CHECK FOR TAB COUNTS ---
  const statusCount = (status) => {
    const now = new Date();
    return events.filter(e => {
      const eventDateTime = new Date(`${e.date}T${e.time}`);
      const effectiveStatus = (eventDateTime < now && e.status !== "rejected") 
        ? "completed" 
        : e.status;
      
      return status === "all" ? true : effectiveStatus === status;
    }).length;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h3>Loading Events...</h3>
      </div>
    );
  }

  return (
    <>
<Sidebar 
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
<Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

      <div className="page-content event-status-page">
        <h2 className="title-main">Event Status</h2>

        {/* FILTER PANEL */}
        <div className="filter-panel">
          <input
            type="text"
            placeholder="Search event name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            <option value="technical">Technical</option>
            <option value="cultural">Cultural</option>
            <option value="sports">Sports</option>
            <option value="workshop">Workshop</option>
            <option value="seminar">Seminar</option>
            <option value="academic">Academic</option>
            <option value="social">Social</option>
            <option value="others">Others</option>
          </select>
          
          <select value={paymentType} onChange={e => setPaymentType(e.target.value)}>
            <option value="">All Payments</option>
            <option value="paid">Paid</option>
            <option value="free">Free</option>
          </select>

          <button className="btn-outline" onClick={() => {
            setSearch(""); setCategory(""); setPaymentType(""); setStatusTab("all");
          }}>Reset</button>
        </div>

        {/* STATUS TABS - Added 'rejected' to the list */}
        <div className="status-tabs">
          {["all", "pending", "approved", "completed", "rejected"].map(tab => (
            <div
              key={tab}
              className={`tab ${statusTab === tab ? "active" : ""}`}
              onClick={() => setStatusTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="tab-count">{statusCount(tab)}</span>
            </div>
          ))}
        </div>

        {/* EVENT CARDS */}
        {filteredEvents.length === 0 ? (
          <div className="empty-state">No events found</div>
        ) : (
          <div className="event-cards-grid">
            {filteredEvents.map(event => {
              // --- SEAT LOGIC ---
              const maxSeats = parseInt(event.maxSeats) || 0;
              const currentRegs = event.currentRegistrations || 0;
              const available = maxSeats > 0 ? (maxSeats - currentRegs) : null;
              const isFull = maxSeats > 0 && currentRegs >= maxSeats;

              return (
                <div key={event.id} className="status-card">
                  
                  <div className="card-poster">
                    {(event.posterURL || event.poster) ? (
                      <img src={event.posterURL || event.poster} alt="Event" />
                    ) : (
                      <div className="no-poster">No Image</div>
                    )}
                    <span className={`status-badge ${event.status}`}>{event.status}</span>
                  </div>

                  <div className="card-body">
                    <div className="card-header">
                      <span className="cat-tag">{event.category}</span>
                      <h3>{event.name}</h3>
                    </div>

                    <p className="card-desc">{event.description}</p>

                    {/* Rejection Reason display */}
                    {event.status === "rejected" && event.rejectionReason && (
                      <div className="rejection-box">
                        <strong>Reason:</strong> {event.rejectionReason}
                      </div>
                    )}

                    {/* ADDED SEAT INDICATOR FOR APPROVED EVENTS */}
                    {event.status === "approved" && (
                      <div className="seat-indicator-inline">
                        {isFull ? (
                          <span className="seats-sold-out">🚫 All Seats Filled</span>
                        ) : available !== null ? (
                          <span className="seats-available">🔥 {available} seats remaining</span>
                        ) : (
                          <span className="seats-open">✅ Registrations Open</span>
                        )}
                      </div>
                    )}

                    <div className="card-info">
                      <span>📅 {event.date}</span>
                      <span>⏰ {event.time}</span>
                    </div>

                    <div className="card-fees">
                      {event.paymentType === "free" ? (
                        <span className="free-tag">Free Registration</span>
                      ) : (
                        <div className="fee-list">
                          {event.soloPrice && <span>Solo: ₹{event.soloPrice}</span>}
                          {event.duetPrice && <span>Duet: ₹{event.duetPrice}</span>}
                          {event.groupPrice && <span>Group: ₹{event.groupPrice}</span>}
                        </div>
                      )}

                      
                    </div>

                    {/* ⭐ EDIT BUTTON ONLY IF EVENT IS STILL PENDING */}
{event.status === "pending" && (
  <button 
    className="edit-btn"
    onClick={() => navigate(`/create-event_o?edit=${event.id}`)}
  >
    ✏ Edit Event
  </button>
)}



                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}