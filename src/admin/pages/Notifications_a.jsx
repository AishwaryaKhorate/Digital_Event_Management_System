import React, { useEffect, useState } from "react";
import { Sidebar, Topbar } from "../components/UIComponents";
import { db } from "../../firebase"; 
import { 
  collection, 
  query, 
  where, // Fixed import
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";
import "../styles/app.css";

function relativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function Notifications_a() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const notificationsRef = collection(db, "notifications");
    
    // Admin only sees system-wide notifications (userId is null)
    const q = query(
        notificationsRef, 
        where("userId", "==", null), 
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setNotifications(list);
        setLoading(false);
    }, (err) => {
        console.error("Query Error:", err);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'alert': return { icon: "🚨", bg: "#fee2e2" }; // Rejections/Deletions
      case 'success': return { icon: "✅", bg: "#dcfce7" }; // Approvals
      case 'user_update': return { icon: "🔄", bg: "#e0e7ff" }; 
      case 'organizer_invite': return { icon: "📩", bg: "#fef9c3" }; 
      default: return { icon: "👤", bg: "#f3f4f6" }; 
    }
  };

  async function toggleRead(id, currentReadStatus) {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "notifications", id), { read: !currentReadStatus });
    } finally { setActionLoading(false); }
  }

  async function removeNotification(id) {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "notifications", id));
    } finally { setActionLoading(false); }
  }

  async function markAllRead() {
    if (actionLoading || notifications.length === 0) return;
    setActionLoading(true);
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      if (!n.read) batch.update(doc(db, "notifications", n.id), { read: true });
    });
    await batch.commit();
    setActionLoading(false);
  }

  async function clearAll() {
    if (actionLoading || notifications.length === 0) return;
    if (!window.confirm("Delete all notifications permanently?")) return;
    setActionLoading(true);
    const batch = writeBatch(db);
    notifications.forEach((n) => batch.delete(doc(db, "notifications", n.id)));
    await batch.commit();
    setActionLoading(false);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
<div className="admin-scope app-layout">
<Sidebar 
  collapsed={!mobileOpen}
  className={mobileOpen ? "open" : ""} 
  onClose={() => setMobileOpen(false)} 
/>
          {/* 💡 UPDATE: Removed inline style to use CSS variables for layout */}
            <div className="main-layout"> 
<Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />

        <main className="content-area">
          <div className="page-card" style={{ padding: '24px' }}>
            <div className="notif-header">
  <h1 className="notif-title">Notifications</h1>

  <div className="notif-sub">
    {loading
      ? "Syncing..."
      : unreadCount > 0
      ? `${unreadCount} unread`
      : "All caught up"}
  </div>

  <div className="notif-actions">
    <button
      onClick={markAllRead}
      disabled={unreadCount === 0 || actionLoading}
      className="btn-outline"
    >
      Mark all read
    </button>

    <button
      onClick={clearAll}
      disabled={notifications.length === 0 || actionLoading}
      className="btn-danger"
    >
      Clear all
    </button>
  </div>
</div>


            {notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280", border: '1px dashed #ccc', borderRadius: '8px' }}>
                <p>No notifications yet.</p>
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                {notifications.map((n) => {
                  const style = getNotificationStyle(n.type);
                  return (
<li
  key={n.id}
  style={{
    display: "flex",
    alignItems: "center",
    padding: "16px",
    borderBottom: "1px solid #f3f4f6",
    background: n.read ? "transparent" : "#f0f7ff"
  }}
>
<div
  style={{
    display: "flex",
    gap: "15px",
    alignItems: "flex-start",
    flex: 1,            // ✅ takes remaining space
    minWidth: 0         // ✅ VERY IMPORTANT for text wrapping
  }}
>
                        <div style={{ width: "45px", height: "45px", borderRadius: "10px", background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
                          {style.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
  <div style={{ fontWeight: 700, color: "#111827" }}>
    {n.title}
  </div>

  <div
    style={{
      fontSize: 14,
      color: "#4b5563",
      wordBreak: "break-word",   // ✅ wraps long text
      whiteSpace: "normal"
    }}
  >
    {n.body}
  </div>

  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: "4px" }}>
    {relativeTime(n.createdAt)}
  </div>
</div>

                      </div>

<div
  style={{
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexShrink: 0,      // ✅ buttons never move
    marginLeft: "16px"
  }}
>
                        <button onClick={() => toggleRead(n.id, n.read)}
                          style={{ background: "#2563eb", padding: "6px 4px", color: "white", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
                          {n.read ? "Mark Unread" : "Mark Read"}
                        </button>
                        <button onClick={() => removeNotification(n.id)}
                          style={{ background: "#fee2e2", border: "none", color: "#dc2626", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}>
                          🗑️
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
      {mobileOpen && (
  <div
    className="overlay"
    onClick={() => setMobileOpen(false)}
  />
)}
    </div>
  );
}