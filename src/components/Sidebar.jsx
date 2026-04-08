import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import "../pages/Home.css";
import { auth, db, onAuthStateChanged, collection, query, where, onSnapshot } from "../firebase";

export default function Sidebar({ isOpen, onClose }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, "notifications"),
          where("userId", "==", user.uid),
          where("read", "==", false)
        );

        const unsubscribeSnap = onSnapshot(q, (snapshot) => {
          setUnreadCount(snapshot.size);
        });

        return () => unsubscribeSnap();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const redDotStyle = {
    backgroundColor: "#ff4d4d",
    color: "white",
    fontSize: "10px",
    fontWeight: "bold",
    minWidth: "18px",
    height: "18px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "8px",
    padding: "2px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>

  {/* CLOSE BTN (Mobile Only) */}
  <button className="sidebar-close-btn" onClick={onClose}>×</button>

  {/* LOGO TOP LEFT */}
  <div className="sidebar-logo-wrapper">
    <div className="sidebar-logo-box">
      <span className="logo-bold">digi</span>
      <span className="logo-thin">Event</span>
    </div>
  </div>


      <div className="sidebar-section">
        <NavLink to="/student_dashboard" className="menu-item" onClick={onClose}>Home</NavLink>
        <NavLink to="/explore" className="menu-item" onClick={onClose}>Explore Events</NavLink>

        <NavLink to="/notifications" className="menu-item" onClick={onClose} style={{ display: "flex", alignItems: "center" }}>
          Notifications
          {unreadCount > 0 && (
            <span style={redDotStyle}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </NavLink>
      </div>


      <div className="sidebar-section">
        <NavLink to="/highlights" className="menu-item" onClick={onClose}>Highlights</NavLink>
        <NavLink to="/feedback" className="menu-item" onClick={onClose}>Feedback</NavLink>
      </div>

    </div>
  );
}
