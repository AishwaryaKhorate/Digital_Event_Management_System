import React, { useEffect, useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { db } from "../../firebase"; 
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Sidebar, Topbar } from "../components/UIComponents";
 import "../styles/app.css";
// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function Reports_a() {
          const [mobileOpen, setMobileOpen] = useState(false);
  
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    categories: {},
    totalRevenue: 0,
  });
  
const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to approved events first to get valid IDs
    const eventsQuery = query(collection(db, "events"), where("status", "==", "approved"));
    
    const unsubscribeEvents = onSnapshot(eventsQuery, (eventSnapshot) => {
      const approvedEventIds = new Set();
      eventSnapshot.forEach(doc => approvedEventIds.add(doc.id));

      // 2. Listen to registrations and filter by the approved IDs found above
      const unsubscribeRegs = onSnapshot(collection(db, "registrations"), (regSnapshot) => {
        let presentCount = 0;
        let absentCount = 0;
        let categoryMap = {};
        let revenue = 0;

        regSnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Only calculate if the event is approved
          if (approvedEventIds.has(data.eventId)) {
            // Calculate Revenue
            revenue += Number(data.amount || 0);

            // Calculate Category Distribution
            const cat = data.eventName || "Other"; 
            categoryMap[cat] = (categoryMap[cat] || 0) + 1;

            // Calculate Attendance Stats
            if (data.participants) {
              data.participants.forEach((p) => {
                if (p.attendanceStatus === "Present") presentCount++;
                else absentCount++;
              });
            }
          }
        });

        setStats({
          present: presentCount,
          absent: absentCount,
          categories: categoryMap,
          totalRevenue: revenue,
        });
      });

      return () => unsubscribeRegs();
    });

    return () => unsubscribeEvents();
  }, []);

  // Data for Doughnut Chart
  const donutData = {
    labels: Object.keys(stats.categories),
    datasets: [
      {
        data: Object.values(stats.categories),
        backgroundColor: ["#0b78d1", "#f59e0b", "#ef4444", "#10b981", "#6366f1"],
        borderWidth: 1,
      },
    ],
  };

  // Data for Bar Chart
  const barData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        label: "Students",
        data: [stats.present, stats.absent],
        backgroundColor: ["#10b981", "#ef4444"],
        borderRadius: 5,
      },
    ],
  };

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
          <div className="page">
            <div className="page-header">
              <h1>Reports &amp; Analytics</h1>
              <div className="revenue-badge" style={{ background: "#dcfce7", color: "#166534", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold" }}>
                Total Revenue: ₹{stats.totalRevenue}
              </div>
            </div>

            <div className="grid-2">
              {/* Attendance Chart */}
              <div className="chart-card" style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
                <h3>Overall Attendance Status</h3>
                <div style={{ height: 300 }}>
                  <Bar 
  data={barData} 
  options={{
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,   // ✅ THIS REMOVES "Students"
      },
    },
  }} 
/>

                </div>
              </div>

              {/* Category Distribution */}
              <div className="chart-card" style={{ background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
                <h3>Registration by Event</h3>
                <div style={{ height: 300 }}>
                  <Doughnut 
                    data={donutData} 
                    options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} 
                  />
                </div>
              </div>
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