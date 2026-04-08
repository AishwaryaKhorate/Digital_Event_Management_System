// src/components/UIComponents.jsx
import React, { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
// Assuming you have firebase imported and passed down or available globally/contextually
// For this to work, you'll need the actual Firebase auth methods in the real component environment.
// import { auth, signOut } from "../../firebase"; // <--- Add this import in your actual file
import { auth, db } from "../../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
// The NotificationBell is currently imported but the logic is included directly in UserMenu.
// import { NotificationBell } from "./NotificationCenter"; // adjust path if needed
import "../../pages/Home.css"; // assuming shared styles


// ==============================================
// ⭐️ NEW: Logout Handler Placeholder 
//    NOTE: Replace with actual Firebase/Auth logic in your app.
// ==============================================
function useLogoutHandler() {
    const navigate = useNavigate();
    
    const handleLogout = () => {
        // --- START: Your actual Logout logic goes here ---
        try {
            // Replace this with your actual signOut(auth) call
            // await signOut(auth); 
            console.log("User logged out (simulated).");
            
            // Clear local storage items for a clean session reset
            localStorage.removeItem("user_profile");
            localStorage.removeItem("user_avatar");
            localStorage.removeItem("notifications");

            // Navigate to the login page
            navigate('/signup'); 

        } catch (error) {
            console.error("Logout Error:", error);
            alert("Error during sign-out. Check console for details.");
        }
        // --- END: Your actual Logout logic goes here ---
    };

    return handleLogout;
}
// ==============================================


/* ---------------- Sidebar (unchanged markup + classNames) ---------------- */
export function Sidebar({ collapsed, onClose, className = "" }) {
  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${className}`}
    >
      <div className="sidebar-logo">
        <span className="logo-text">digiEvent</span>

        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/admin_dashboard"
          end
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <span className="nav-icon">📊</span>
          <span className="nav-text">Dashboard</span>
        </NavLink>

        <NavLink
          to="/admin/admin/events_a"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <span className="nav-icon">📅</span>
          <span className="nav-text">Event Management</span>
        </NavLink>

        <NavLink
          to="/admin/users_a"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <span className="nav-icon">👥</span>
          <span className="nav-text">User Management</span>
        </NavLink>

        <NavLink
          to="/admin/reports_a"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <span className="nav-icon">📈</span>
          <span className="nav-text">Reports</span>
        </NavLink>

        <NavLink
          to="/admin/feedback_a"
          className={({ isActive }) =>
            isActive ? "nav-item active" : "nav-item"
          }
        >
          <span className="nav-icon">💬</span>
          <span className="nav-text">Feedback</span>
        </NavLink>
      </nav>
    </aside>
  );
}


/* ---------------- Simple Search Suggestion engine (demo sample data) ----------------*/
const SAMPLE_EVENTS = [
  { id: "e1", title: "Tech Innovate Summit", org: "GlobalTech" },
  { id: "e2", title: "AI & ML Workshop", org: "AI Labs" },
  { id: "e3", title: "Design Thinking Bootcamp", org: "UX Club" },
];

const SAMPLE_USERS = [
  { id: "u1", name: "Alice Johnson", email: "alice.j@example.com" },
  { id: "u2", name: "Bob Williams", email: "bob.w@example.com" },
  { id: "u3", name: "Charlie Brown", email: "charlie.b@example.com" },
];

const SAMPLE_REPORTS = [
  { id: "r1", title: "Monthly Registrations" },
  { id: "r2", title: "Payment Summary" },
];

/* ---------------- SearchBar (centered) with live dropdown ---------------- */
export function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const wrapperRef = useRef();

  // compute results on q change
  useEffect(() => {
    const term = q.trim().toLowerCase();
    if (!term) {
      // show top quick actions when empty
      setResults([
        { kind: "action", id: "a1", title: "View all events" },
        { kind: "action", id: "a2", title: "View users" },
        { kind: "action", id: "a3", title: "Open reports" },
      ]);
      return;
    }

    const events = SAMPLE_EVENTS
      .filter((e) => e.title.toLowerCase().includes(term))
      .map((e) => ({ kind: "event", ...e }));
    const users = SAMPLE_USERS
      .filter((u) => u.name.toLowerCase().includes(term) || (u.email || "").toLowerCase().includes(term))
      .map((u) => ({ kind: "user", ...u }));
    const reports = SAMPLE_REPORTS
      .filter((r) => r.title.toLowerCase().includes(term))
      .map((r) => ({ kind: "report", ...r }));

    // also include feedback/notifications if you store them in localStorage
    const notifications = (() => {
      try {
        const raw = localStorage.getItem("notifications");
        const list = raw ? JSON.parse(raw) : [];
        return list
          .filter((n) => (n.title + " " + (n.body || "")).toLowerCase().includes(term))
          .slice(0, 5)
          .map((n) => ({ kind: "notification", ...n }));
      } catch {
        return [];
      }
    })();

    setResults([...events, ...users, ...reports, ...notifications]);
  }, [q]);

  // close when clicking outside
  useEffect(() => {
    function onClickOutside(e) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, []);

  function handleSelect(item) {
    setOpen(false);
    setQ("");
    // Navigate depending on type. We pass query param `q` so pages can read it.
    if (item.kind === "event") {
      navigate(`/admin/admin/events_a?q=${encodeURIComponent(item.title)}`);
    } else if (item.kind === "user") {
      navigate(`/admin/users_a?q=${encodeURIComponent(item.name)}`);
    } else if (item.kind === "report") {
      navigate(`/admin/reports_a?q=${encodeURIComponent(item.title)}`);
    } else if (item.kind === "notification") {
      navigate(`/admin/notifications_a`);
    } else if (item.kind === "action") {
      // quick actions
      if (item.title.toLowerCase().includes("events")) navigate(`/admin/admin/events_a`);
      else if (item.title.toLowerCase().includes("users")) navigate(`/admin/users_a`);
      else if (item.title.toLowerCase().includes("report")) navigate(`/admin/reports_a`);
      else navigate(`/_a`);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", maxWidth: 820 }}>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search events, users, feedback..."
        aria-label="Search events, users, feedback"
        className="search-input"
        style={{
          width: "100%",
          height: 44,
          borderRadius: 22,
          padding: "0 18px",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "none",
          outline: "none",
        }}
      />

      {open && results && results.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            right: 0,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(16,24,40,0.08)",
            overflow: "hidden",
            zIndex: 1200,
          }}
        >
          {results.map((r) => (
            <div
              key={r.id}
              onClick={() => handleSelect(r)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleSelect(r); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 16px",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: r.kind === "event" ? "#eef2ff" : r.kind === "user" ? "#f3e8ff" : "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: r.kind === "event" ? "#1e3a8a" : "#6b21a8", fontWeight: 700
                }}>
                  {r.kind === "event" ? "E" : r.kind === "user" ? "U" : r.kind === "report" ? "R" : "N"}
                </div>

                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>
                    {r.title ?? r.name ?? r.id}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    {r.kind === "event" ? (r.org || "") : r.kind === "user" ? (r.email || "") : r.kind === "notification" ? (r.body || "") : ""}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {r.kind === "event" ? "Event" : r.kind === "user" ? "User" : r.kind === "report" ? "Report" : "Notification"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Topbar: centered search + right-side icons ---------------- */
// NOTE: I removed the unused `setCollapsed` prop from Topbar for simplicity,
// as the sidebar toggle button doesn't seem to be fully implemented here.
export function Topbar({ onMenuClick }) {
  return (
    <header
      className="topbar"
      style={{ display: "flex", alignItems: "center", gap: 12, height: 64 }}
    >
      {/* ☰ MENU BUTTON */}
      <button
        className="menu-btn"
        onClick={onMenuClick}
        style={{
          fontSize: 24,
          background: "#2563eb",
          color: "#e7e6e6ff",
          border: "none",
          borderRadius: 10,
          width: 42,
          height: 42,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 10px rgba(37,99,235,0.35)"
        }}
      >
        ☰
      </button>

      {/* RIGHT SIDE ICONS */}
      <div
        className="topbar-right"
        style={{
          marginLeft: "auto",
          minWidth: 160,
          display: "flex",
          justifyContent: "flex-end",
          paddingRight: 14
        }}
      >
        <UserMenu />
      </div>
    </header>
  );
}


/* ---------------- Inline Bell Icon SVG ---------------- */
function BellIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.6 14.6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 10-3 0v.68C7.63 5.36 6 7.92 6 11v3.6c0 .54-.22 1.06-.595 1.45L4 17h11" stroke="#0f172a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#0f172a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


/* ---------------- UserMenu exported (updated) ----------------
   - **NEW**: Logout Button added before the Notification Bell.
*/

export function UserMenu() {
  const navigate = useNavigate();
  const handleLogout = useLogoutHandler();

  const [avatar, setAvatar] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 1. Listen for Auth State & Fetch Profile Data
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setAvatar(data.photoURL || null);
            setUserName(data.name || "Admin");
          } else {
            setUserName(user.email ? user.email.split("@")[0] : "Admin");
          }
        } catch (err) {
          console.error("Error fetching UserMenu data:", err);
        }
      }
      setLoading(false);
    });

    // 2. LIVE NOTIFICATION LISTENER (Red Dot Logic)
    // Listens for unread notifications where userId is null (Admin targets)
    const q = query(
      collection(db, "notifications"),
      where("read", "==", false),
      where("userId", "==", null)
    );

    const unsubscribeNotifs = onSnapshot(q, (snapshot) => {
      // The badge/dot updates instantly when a new doc hits Firestore
      setUnreadCount(snapshot.size);
    }, (err) => {
      console.error("Notification listener error:", err);
    });

    // 3. Listen for profile updates (Custom Event)
    const handleUpdate = (e) => setAvatar(e.detail);
    window.addEventListener("admin-profile-updated", handleUpdate);

    return () => {
      unsubscribeAuth();
      unsubscribeNotifs();
      window.removeEventListener("admin-profile-updated", handleUpdate);
    };
  }, []);

  if (loading) return <div style={{ width: 38, height: 38, opacity: 0.5 }}>...</div>;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {/* Logout Button */}
      <button
        onClick={handleLogout}
        style={{
          padding: "6px 12px",
          background: "#f87171",
          color: "#ffffffff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 13,
          transition: "background 0.2s"
        }}
        onMouseOver={(e) => (e.target.style.background = "#ef4444")}
        onMouseOut={(e) => (e.target.style.background = "#f87171")}
      >
        Logout
      </button>

      {/* Bell Icon with Real-Time Red Dot */}
      <div
        role="button"
        title="Notifications"
        onClick={() => navigate("/admin/notifications_a")}
        style={{ position: "relative", cursor: "pointer", padding: 6 }}
      >
        <BellIcon />

        {unreadCount > 0 && (
          <>
            {/* Pulsing effect to notify Admin of NEW items */}
            <span className="bell-ping"></span>
            {/* Static Red Dot */}
            <span
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                background: "#ef4444",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                border: "2px solid #fff",
                zIndex: 2
              }}
            ></span>
          </>
        )}
      </div>

      {/* Profile Avatar / Initial */}
      <div
        role="button"
        onClick={() => navigate("/admin/profile_a")}
        style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt="profile"
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #7c3aed"
            }}
          />
        ) : (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#eef2ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#3730a3",
              fontWeight: 700,
              border: "1px solid #7c3aed"
            }}
          >
            {userName ? userName[0].toUpperCase() : "A"}
          </div>
        )}
      </div>

      {/* Internal CSS for the Ping Animation */}
      <style>{`
        .bell-ping {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 10px;
          height: 10px;
          background: #ef4444;
          border-radius: 50%;
          animation: ping-animation 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes ping-animation {
          75%, 100% {
            transform: scale(3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}