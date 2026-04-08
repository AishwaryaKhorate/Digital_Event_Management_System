import React, { useState, useMemo, useEffect } from "react";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import "./DashboardHome_o.css";

// Firebase Imports
import { auth, db } from "../firebase";
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const CATEGORIES = [
  { key: "all", label: "All", color: "#64748b" },
  { key: "technical", label: "Technical", color: "#2196f3" },
  { key: "cultural", label: "Cultural", color: "#e91e63" },
  { key: "sports", label: "Sports", color: "#4caf50" },
  { key: "workshop", label: "Workshop", color: "#ff9800" },
  { key: "seminar", label: "Seminar", color: "#673ab7" },
  { key: "academic", label: "Academic", color: "#3454d1" },
  { key: "social", label: "Social", color: "#00bcd4" },
  { key: "others", label: "Others", color: "#607d8b" }
];

export default function DashboardHome() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [userName, setUserName] = useState("Organizer");
  const [realEvents, setRealEvents] = useState([]);
  const [realActivities, setRealActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);


useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      // 1. Fetch Organizer Name
      onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) setUserName(docSnap.data().name || "Organizer");
      });

      // 2. Fetch ONLY this organizer's events
      const q = query(
        collection(db, "events"), 
        where("organizerId", "==", user.uid), 
        orderBy("createdAt", "desc")
      );
      
      onSnapshot(q, (snapshot) => {
        setRealEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      });

      // 3. Fetch ONLY feedback for this organizer's events
      const activityQ = query(
        collection(db, "feedback"), 
        where("organizerId", "==", user.uid), 
        orderBy("createdAt", "desc"), 
        limit(10)
      );

      onSnapshot(activityQ, (snapshot) => {
        setRealActivities(snapshot.docs.map(doc => ({
          id: doc.id,
          text: `${doc.data().name} reviewed '${doc.data().event}'`,
          // Ensure your field name is exactly 'createdAt' as shown in your DB screenshot
          time: doc.data().createdAt?.toDate().toLocaleDateString('en-GB') || "Recently"
        })));
      });
    }
  });

  return () => unsubscribeAuth();
}, []); // Ensure this closing is correct
  const selectedColor = useMemo(() => {
    return CATEGORIES.find(x => x.key === selectedCategory)?.color || "#0b73d1";
  }, [selectedCategory]);

  // 1. Calculate Stats
  const stats = useMemo(() => {
    const now = new Date();
    const filtered = realEvents.filter(ev => selectedCategory === "all" || ev.category?.toLowerCase() === selectedCategory);
    
    return filtered.reduce((acc, ev) => {
      const eventDateTime = new Date(`${ev.date}T${ev.time}`);
      const isPast = eventDateTime < now;
      let status = ev.status;
      if (isPast && ev.status !== "rejected") status = "completed";

      acc.totalCreated++;
      if (status === "approved") acc.approved++;
      if (status === "pending") acc.pending++;
      if (status === "rejected") acc.rejected++;
      if (status === "completed") acc.completed++;
      return acc;
    }, { totalCreated: 0, approved: 0, pending: 0, rejected: 0, completed: 0 });
  }, [realEvents, selectedCategory]);

  // 2. Calculate Upcoming Events (Fixes the Console Error)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return realEvents
      .filter(ev => {
        const eventDateTime = new Date(`${ev.date}T${ev.time}`);
        return ev.status === "approved" && eventDateTime > now;
      })
      .slice(0, 10); // Show up to 10
  }, [realEvents]);

  return (
    <>
<Sidebar 
  isOpen={sidebarOpen} 
  onClose={() => setSidebarOpen(false)}
/>
      <Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />


      <div className="page-content dashboard" style={{ "--accent": selectedColor }}>
        <div className="card welcome-banner">
          <h1>Welcome, {userName}</h1>
          <div className="category-controls">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                className={`category-pill ${selectedCategory === cat.key ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <h3 className="section-title">Quick Stats</h3>
        <div className="quick-stats">
          <div className="stat-card card">
            <div className="stat-icon">📅</div>
            <div><h2>{stats.totalCreated}</h2><p>Total Events</p></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ color: "#16a34a" }}>✅</div>
            <div><h2>{stats.approved}</h2><p>Approved</p></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ color: "#f59e0b" }}>⏳</div>
            <div><h2>{stats.pending}</h2><p>Pending</p></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ color: "#6366f1" }}>🏁</div>
            <div><h2>{stats.completed}</h2><p>Completed</p></div>
          </div>
          <div className="stat-card card">
            <div className="stat-icon" style={{ color: "#ef4444" }}>❌</div>
            <div><h2>{stats.rejected}</h2><p>Rejected</p></div>
          </div>
        </div>
<div className="row">
  {/* LEFT CARD */}
  <div className="card upcoming">
    <h3>Upcoming Events</h3>
    <div className="scroll-container">
      {loading ? <p className="small">Loading...</p> : 
        upcomingEvents.length === 0 ? <p className="small">No events.</p> : 
        upcomingEvents.map(ev => (
          <div key={ev.id} className="up-item">
            <span>{ev.name}</span>
            <span className="date approved">{ev.date}</span>
          </div>
        ))
      }
    </div>
  </div>

  {/* RIGHT CARD */}
  <div className="card activities">
    <h3>Recent Activities</h3>
    <div className="scroll-container">
      {realActivities.length === 0 ? <p className="small">No activity.</p> : 
        realActivities.map(a => (
          <div key={a.id} className="act-item">
            <p style={{ margin: 0, fontSize: '14px' }}>{a.text}</p>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{a.time}</span>
          </div>
        ))
      }
    </div>
  </div>
</div>
      </div>
    </>
  );
}