import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/navbar";
import "./notification.css";

import { 
    auth, db, onAuthStateChanged, collection, onSnapshot, 
    query, where, orderBy, updateDoc, doc, deleteDoc, writeBatch 
} from '../firebase'; 

export default function Notifications() {
    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setLoading(false);
        });
        return () => unsubscribe();
    }, []);

   useEffect(() => {
    if (!user?.uid) return;
    
    const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(document => {
            const rawData = document.data();
            let dateObj;

            // --- HYBRID DATE HANDLING ---
            if (!rawData.createdAt) {
                dateObj = null;
            } else if (typeof rawData.createdAt === 'string') {
                // Handle the new "ISO String" format
                dateObj = new Date(rawData.createdAt);
            } else if (rawData.createdAt.seconds) {
                // Handle the old "Firebase Timestamp" format
                dateObj = new Date(rawData.createdAt.seconds * 1000);
            }

            return {
                id: document.id,
                ...rawData,
                timeStr: (dateObj && !isNaN(dateObj)) 
                    ? dateObj.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) 
                    : 'Just now',
            };
        });
        setNotifications(data);
        setLoading(false);
    }, (err) => {
        console.error("Firestore Error:", err);
        setLoading(false);
    });

    return () => unsubscribe();
}, [user]);

    const markAllRead = async () => {
        if (notifications.length === 0) return;
        const batch = writeBatch(db);
        notifications.forEach(n => {
            if (!n.read) batch.update(doc(db, "notifications", n.id), { read: true });
        });
        await batch.commit();
    };

    const clearAll = async () => {
        if (notifications.length === 0) return;
        if (!window.confirm("Are you sure you want to delete all notifications?")) return;
        const batch = writeBatch(db);
        notifications.forEach(n => batch.delete(doc(db, "notifications", n.id)));
        await batch.commit();
    };

    const toggleRead = async (id, currentStatus) => {
        await updateDoc(doc(db, "notifications", id), { read: !currentStatus });
    };

    const deleteOne = async (id) => {
        await deleteDoc(doc(db, "notifications", id));
    };

    return (
        <div className="app-shell">
<Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="main-content">
<Navbar onMenuClick={() => setSidebarOpen(true)} />
    {/* OVERLAY */}
{isSidebarOpen && (
  <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
)}


                <div className="notify-page">
                    <header className="notify-header">
                        <div className="title-area">
                            <h1>Notifications</h1>
                        </div>
                        <div className="header-actions">
                            <button className="btn-header btn-clear-all" onClick={clearAll}>
                                 Clear All
                            </button>
                            <button className="btn-header btn-mark-all" onClick={markAllRead}>
                                ✓ Mark All Read
                            </button>
                        </div>
                    </header>

                    <div className="notify-list">
                        {loading ? (
                            <p style={{textAlign: 'center', padding: '20px'}}>Syncing data...</p>
                        ) : notifications.length === 0 ? (
                            <div style={{textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px'}}>
                                <p style={{color: '#94a3b8'}}>No notifications found in your inbox.</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n.id} className={`notify-card ${!n.read ? 'unread' : ''}`}>
                                    <div className="card-content">
                                        <h4>{n.title || "Announcement"}</h4>
                                        <p>{n.body || n.text}</p>
                                    </div>
                                    <div className="card-right">
                                        <span className="card-time">{n.timeStr}</span>
                                        <div className="card-actions">
                                            <button className="btn-item" onClick={() => toggleRead(n.id, n.read)}>
                                                {n.read ? "Mark Unread" : "Mark Read"}
                                            </button>
                              <button className="btn-item btn-delete" onClick={() => deleteOne(n.id)}
                              style={{ background: "#fee2e2", border: "none", color: "#dc2626", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}>
                          🗑️
                        </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}