import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import { db } from "../firebase"; 
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "./RegisteredStudents_o.css";

export default function RegisteredStudents() {
  const [students, setStudents] = useState([]);
  const [eventOptions, setEventOptions] = useState([{ value: "all", label: "All Events" }]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");

    const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("name", "asc"));
    return onSnapshot(q, (snapshot) => {
      const options = [{ value: "all", label: "All Events" }];
      snapshot.forEach((doc) => options.push({ value: doc.id, label: doc.data().name }));
      setEventOptions(options);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "registrations"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
      const allRegistrations = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants) {
          data.participants.forEach((p, index) => {
            allRegistrations.push({
              id: `${doc.id}-${index}`,
              name: p.name,
              email: p.email,
              college: p.college,
              eventName: data.eventName,
              eventId: data.eventId, 
              regTime: data.timestamp?.toDate().toLocaleString() || "Pending...",
              attendance: (p.attendanceStatus || "Absent").toLowerCase() 
            });
          });
        }
      });
      setStudents(allRegistrations);
      setLoading(false);
    });
  }, []);

  // 💡 Function to reset all filters to default
  const handleReset = () => {
    setSearch("");
    setAttendanceFilter("all");
    setEventFilter("all");
  };

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      const matchesSearch = !q || (
        s.name.toLowerCase().includes(q) || 
        s.college.toLowerCase().includes(q) || 
        s.email.toLowerCase().includes(q)
      );
      const matchesAttendance = (attendanceFilter === "all") || (s.attendance === attendanceFilter);
      const matchesEvent = (eventFilter === "all") || (s.eventId === eventFilter);
      return matchesSearch && matchesAttendance && matchesEvent;
    });
  }, [students, search, attendanceFilter, eventFilter]);

  return (
    <>
<Sidebar 
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
      <div className="main-content">
<Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

        <div className="page-header-wrapper">
          <h2 className="title-main">Registered Students</h2>
          <div className="top-controls">
            <input 
              type="text" 
              className="search-bar" 
              placeholder="Search by Name, College or Email..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            <select className="filter-dropdown" value={eventFilter} onChange={e => setEventFilter(e.target.value)}>
              {eventOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <select className="filter-dropdown" value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value)}>
              <option value="all">All Attendance</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>

            {/* 💡 Reset Button Added Here */}
            <button className="reset-btn" onClick={handleReset} style={{ 
              marginLeft: '10px', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              border: '1px solid #ddd', 
              backgroundColor: '#006dff', 
              cursor: 'pointer',
              fontWeight: '700',
              color: 'white'
            }}>
              Reset
            </button>
          </div>
        </div>

        <div className="page-content register-page">
          <div className="card table-card">
            {loading ? <div className="loader-blue">Loading Registrations...</div> : (
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>College Name</th>
                    <th>Event Name</th>
                    <th>Registration Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.length > 0 ? visibleStudents.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.email}</td>
                      <td>{s.college}</td>
                      <td><span className="event-badge">{s.eventName}</span></td>
                      <td>{s.regTime}</td>
                      <td><span className={`badge ${s.attendance}`}>{s.attendance}</span></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                        No registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}