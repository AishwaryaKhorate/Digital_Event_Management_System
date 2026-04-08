// src/pages/OrganizerEventsDetails.jsx
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";

export default function OrganizerEventsDetails() {
  const location = useLocation();

  // read ?filter=total / upcoming / completed
  const params = new URLSearchParams(location.search);
  const filter = params.get("filter") || "total";

  const titleMap = {
    total: "All Organized Events",
    upcoming: "Upcoming Events",
    completed: "Completed Events",
  };

  const title = titleMap[filter] || "Events";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // dummy data – replace with real events later
  const allEvents = [
    { id: 1, name: "Annual Tech Fest", status: "completed", date: "2025-12-10" },
    { id: 2, name: "Robotics Challenge", status: "upcoming", date: "2025-12-18" },
    { id: 3, name: "Alumni Meet", status: "completed", date: "2025-11-05" },
    { id: 4, name: "Open Mic Night", status: "upcoming", date: "2025-12-25" },
    { id: 5, name: "Cultural Gala Night", status: "upcoming", date: "2026-01-15" },
    { id: 6, name: "Career Fair", status: "completed", date: "2025-08-20" },
  ];

  const filteredEvents = allEvents.filter((e) => {
    if (filter === "upcoming") return e.status === "upcoming";
    if (filter === "completed") return e.status === "completed";
    return true; // "total" or anything else ⇒ show all
  });

  return (
    <>
<Sidebar 
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
<Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

      <div className="page-content">
        <h2 style={{ marginBottom: "20px" }}>{title}</h2>

        <div className="card">
          {filteredEvents.length === 0 ? (
            <p>No events found for this category.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {filteredEvents.map((event) => (
                <li
                  key={event.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{event.name}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      Status: {event.status}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {event.date}
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
