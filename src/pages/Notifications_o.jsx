import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from "firebase/firestore";
import "./Notifications_o.css";

export default function Notifications_o() {
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => setCurrentUser(user));
    return () => unsub();
  }, []);

  // Fetch Logic (Matching Admin logic but filtered by userId)
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // Actions
  const toggleRead = (id, currentStatus) => 
    updateDoc(doc(db, "notifications", id), { read: !currentStatus });

  const deleteOne = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    await deleteDoc(doc(db, "notifications", id));
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.read) batch.update(doc(db, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const clearAll = async () => {
    if (!window.confirm("Delete ALL notifications?")) return;
    const batch = writeBatch(db);
    notifications.forEach(n => batch.delete(doc(db, "notifications", n.id)));
    await batch.commit();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
<Sidebar 
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
<Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

      <div className="page-content" style={{ marginLeft: "250px", paddingTop: "20px" }}>
        <div className="page-card" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
          
                      {/* Header Section */}
<div className="notif-header-wrap">

  {/* Row 1: Heading centered */}
  <h1 className="notif-main-title">Notifications</h1>

  {/* Row 2: Left count + Right buttons */}
  <div className="notif-subrow">
    <div className="notif-count">
      {loading ? "Syncing..." : unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
    </div>

    <div className="notif-actions">
      <button
        onClick={markAllRead}
        disabled={unreadCount === 0}
        className="btn-markall"
      >
        Mark all read
      </button>

      <button
        onClick={clearAll}
        disabled={notifications.length === 0}
        className="btn-clearall"
      >
        Clear all
      </button>
    </div>
  </div>

</div>


          {/* List Section - Identical to Admin */}
          {notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6b7280", border: '1px dashed #ccc', borderRadius: '8px' }}>
              <p>No notifications yet.</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid #e5e7eb", borderRadius: "8px", background: '#fff' }}>
              {notifications.map((n) => (
                <li key={n.id} style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  padding: "16px", 
                  borderBottom: "1px solid #f3f4f6", 
                  background: n.read ? "transparent" : "#f0f7ff" 
                }}>
                  <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                    <div style={{ 
                      width: "45px", height: "45px", borderRadius: "10px", 
                      background: "#f3f4f6", display: "flex", 
                      alignItems: "center", justifyContent: "center", fontSize: "22px" 
                    }}>
                      🔔
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{n.title}</div>
                      <div style={{ fontSize: 14, color: "#4b5563" }}>{n.body}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: "4px" }}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : "Just now"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button onClick={() => toggleRead(n.id, n.read)}
                      style={{ background: "#2563eb", padding: "8px 15px", color: "white", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "600", border: 'none' }}>
                      {n.read ? "Mark Unread" : "Mark Read"}
                    </button>
                    <button onClick={() => deleteOne(n.id)}
                      style={{ background: "#fee2e2", border: "none", color: "#dc2626", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}>
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}