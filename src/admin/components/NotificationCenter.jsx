// src/components/NotificationCenter.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const KEY = "notifications_v1";
const NotificationContext = createContext(null);

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const normalized = parsed.map((n, i) => ({
        id: n.id ?? `n_${i}`,
        title: n.title ?? "Notification",
        body: n.body ?? "",
        type: n.type ?? "update",
        createdAt: n.createdAt ?? new Date().toISOString(),
        read: !!n.read,
      }));
      setNotifications(normalized);
    } catch (e) {
      console.error("Failed to load notifications:", e);
      setNotifications([]);
    }
  }, []);

  function persist(next) {
    setNotifications(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save notifications:", e);
    }
  }

  function addNotification(payload) {
    const next = [
      {
        id: payload.id ?? `n_${Date.now()}`,
        title: payload.title ?? "Notification",
        body: payload.body ?? "",
        type: payload.type ?? "update",
        createdAt: payload.createdAt ?? new Date().toISOString(),
        read: !!payload.read,
      },
      ...notifications,
    ];
    persist(next);
  }

  function toggleRead(id) {
    persist(notifications.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  }

  function markAllRead() {
    persist(notifications.map((n) => ({ ...n, read: true })));
  }

  function markAllUnread() {
    persist(notifications.map((n) => ({ ...n, read: false })));
  }

  function removeNotification(id) {
    persist(notifications.filter((n) => n.id !== id));
  }

  function clearAll() {
    persist([]);
  }

  function seedDummy() {
    const sample = [
      {
        id: "n_1",
        title: "New student registered",
        body: "Ankita Sharma registered for 'AI Basics'.",
        type: "user",
        createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        read: false,
      },
      {
        id: "n_2",
        title: "Payment received",
        body: "₹499 payment for Event #23 succeeded.",
        type: "success",
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        read: false,
      },
      {
        id: "n_3",
        title: "Event time changed",
        body: "Workshop 'React Deep-Dive' rescheduled to 5 PM.",
        type: "event",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: true,
      },
    ];
    persist(sample);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        toggleRead,
        markAllRead,
        markAllUnread,
        removeNotification,
        clearAll,
        seedDummy,
        unreadCount,
        drawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}

/* ---------------- NotificationBell ---------------- */
export function NotificationBell({ className }) {
  const { unreadCount, setDrawerOpen } = useNotifications();
  return (
    <button
      onClick={() => setDrawerOpen((s) => !s)}
      aria-label="Open notifications"
      className={`notification-bell ${className || ""}`}
      title="Notifications"
      type="button"
      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M15 17H9a3 3 0 01-3-3V11a6 6 0 0112 0v3a3 3 0 01-3 3z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {unreadCount > 0 && <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
  );
}

/* ---------------- NotificationDrawer ---------------- */
export function NotificationDrawer() {
  const {
    notifications,
    toggleRead,
    markAllRead,
    markAllUnread,
    removeNotification,
    clearAll,
    seedDummy,
    drawerOpen,
    setDrawerOpen,
  } = useNotifications();

  return (
    <>
      <div className={`notif-overlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} aria-hidden />

      <aside className={`notif-drawer ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="notif-drawer-header">
          <div>
            <h3 style={{ margin: 0 }}>Notifications</h3>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>
              {notifications.filter((n) => !n.read).length > 0
                ? `${notifications.filter((n) => !n.read).length} unread`
                : "All caught up"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn" onClick={markAllRead} disabled={notifications.length === 0}>
              Mark all read
            </button>
            <button className="btn btn-ghost" onClick={clearAll} disabled={notifications.length === 0}>
              Clear
            </button>
            <button className="btn btn-ghost" onClick={() => seedDummy()}>
              Seed
            </button>
            <button className="btn btn-ghost" onClick={() => setDrawerOpen(false)} aria-label="Close notifications">
              Close
            </button>
          </div>
        </div>

        <div className="notif-list-wrap">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <p style={{ margin: 0, fontSize: 16 }}>No notifications yet.</p>
              <p style={{ marginTop: 8, color: "#6b7280" }}>You will see system messages, approvals and payments here.</p>
            </div>
          ) : (
            <ul className="notifications-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notification-item ${n.read ? "read" : "unread"}`}
                  onClick={() => toggleRead(n.id)}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        flexShrink: 0,
                        background: n.read ? "#f3f4f6" : "#eef2ff",
                        color: "#0f172a",
                      }}
                    >
                      {n.title ? n.title.charAt(0).toUpperCase() : "N"}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div>
                      <div style={{ marginTop: 6, color: "#374151", fontSize: 13 }}>{n.body}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 90 }}>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{relativeTime(n.createdAt)}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        className="btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRead(n.id);
                        }}
                      >
                        {n.read ? "Mark unread" : "Mark read"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(n.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
