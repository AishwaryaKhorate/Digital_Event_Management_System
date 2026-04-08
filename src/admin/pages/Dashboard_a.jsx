import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Sidebar, Topbar } from "../components/UIComponents";
import { db } from "../../firebase"; 
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import "../styles/app.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
);

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Dashboard_a() {
   const [mobileOpen, setMobileOpen] = useState(window.innerWidth > 768);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalEvents: 0, totalUsers: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartDataState, setChartDataState] = useState(null);

  const q = useQuery().get("q") || "";
  const queryStr = q.trim().toLowerCase();

  useEffect(() => {
    // 1. Fetch Real Stats (ONLY Approved Events)
    const approvedEventsQuery = query(collection(db, "events"), where("status", "==", "approved"));
    const unsubEvents = onSnapshot(approvedEventsQuery, (snap) => {
      setStats(prev => ({ ...prev, totalEvents: snap.size }));
    });

    // 2. Fetch Real Stats (Total Users)
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setStats(prev => ({ ...prev, totalUsers: snap.size }));
    });

    // 3. Fetch Recent Activity (Real Registrations)
    const activityQuery = query(collection(db, "registrations"), orderBy("timestamp", "desc"), limit(5));
    const unsubActivity = onSnapshot(activityQuery, (snap) => {
      const activities = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: `New registration for '${data.eventName}'`,
          time: data.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "Just now"
        };
      });
      setRecentActivity(activities);
    });

    // 4. Process Chart Data (Registrations per Month)
    const unsubChart = onSnapshot(collection(db, "registrations"), (snap) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthCounts = {};
      const currentMonth = new Date().getMonth();
      const labels = [];

      for (let i = 5; i >= 0; i--) {
        const m = months[(currentMonth - i + 12) % 12];
        labels.push(m);
        monthCounts[m] = 0;
      }

      snap.forEach(doc => {
        const date = doc.data().timestamp?.toDate();
        if (date) {
          const m = months[date.getMonth()];
          if (monthCounts.hasOwnProperty(m)) monthCounts[m]++;
        }
      });

      setChartDataState({
        labels,
        datasets: [
          {
            label: "Registrations",
            data: labels.map(l => monthCounts[l]),
            borderColor: "#0b78d1",
            backgroundColor: "rgba(11,120,209,0.12)",
            tension: 0.35,
            fill: true
          }
        ]
      });
      setLoading(false);
    });

    return () => {
      unsubEvents();
      unsubUsers();
      unsubActivity();
      unsubChart();
    };
  }, []);

  const filteredActivity = queryStr
    ? recentActivity.filter((a) => a.text.toLowerCase().includes(queryStr))
    : recentActivity;

  return (
<div className="admin-scope app-layout">
  <Sidebar 
  collapsed={!mobileOpen}
  className={mobileOpen ? "open" : ""} 
  onClose={() => setMobileOpen(false)} 
/>


<div className="main-layout">
<Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />

        <main className="content-area">
          <div className="page dashboard-page">
            <div className="page-header">
              <h1>Dashboard Overview</h1>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div>
                  <div className="stat-value">{stats.totalEvents.toLocaleString()}</div>
                  <div className="muted">Approved Events</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div>
                  <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
                  <div className="muted">Users Registered</div>
                </div>
              </div>
            </div>

            <div className="charts-area">
              <div className="chart-card">
                <h3>Monthly Event Registrations</h3>
                {loading || !chartDataState ? (
                  <div className="chart-skeleton">
                    <div className="skeleton" />
                    <div className="skeleton short" />
                  </div>
                ) : (
                  <div style={{ height: 340 }}>
                    <Line
                      data={chartDataState}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                )}
              </div>

              <aside className="activity-card">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {filteredActivity.map((a) => (
                    <div key={a.id} className="activity-item">
                      <div>{a.text}</div>
                      <small className="muted">{a.time}</small>
                    </div>
                  ))}
                  {!loading && filteredActivity.length === 0 && (
                    <div className="muted" style={{ padding: "10px" }}>No recent activity</div>
                  )}
                </div>
              </aside>
            </div>
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