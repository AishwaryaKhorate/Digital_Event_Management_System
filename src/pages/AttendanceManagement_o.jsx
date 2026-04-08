import React, { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import ScannerUI from "../components/ScannerUI";
import "./AttendanceManagement_o.css";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function AttendanceManagement() {
  const processingRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [eventFilter, setEventFilter] = useState("All");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [eventOptions, setEventOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  // Add this near your other useState hooks
const [releasing, setReleasing] = useState(false);

  // Initialize Firebase Functions
  const functionsInstance = getFunctions();
  const sendCertFunc = httpsCallable(functionsInstance, 'generateAndSendCertificates');

  const [sidebarOpen, setSidebarOpen] = useState(false);


 useEffect(() => {
    const q = query(collection(db, "events"), orderBy("name", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date(); // Get current date and time

      const eventsList = snapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }))
        .filter(event => {
          // 1. Status must be approved
          const isApproved = event.status === "approved";
          
          // 2. Combine Date and Time into a comparable object
          // Assuming event.date is "YYYY-MM-DD" and event.time is "HH:mm" (24hr)
          const eventDateTime = new Date(`${event.date}T${event.time || "00:00"}`);
          
          // 3. Must be in the future (Event Time > Current Time)
          const isNotPassed = eventDateTime > now;

          return isApproved && isNotPassed;
        }) 
        .map(event => ({
          id: event.id,
          name: event.name || event.title
        }));

      setEventOptions(eventsList);
    }, (error) => {
      console.error("Error fetching events:", error);
    });

    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const q = query(collection(db, "registrations"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allStudents = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants) {
          const dateObj = data.timestamp?.toDate();
          const formattedDate = dateObj 
            ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : "N/A";

          data.participants.forEach((p, index) => {
            allStudents.push({
              docId: doc.id,
              registrationId: data.registrationId,
              index: index,
              name: p.name,
              email: p.email || "N/A",
              college: p.college || "N/A",
              eventName: data.eventName || "N/A",
              regDateTime: formattedDate,
              status: p.attendanceStatus || "Absent",
              allParticipants: data.participants       
            });
          });
        }
      });
      setStudents(allStudents);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- UPDATED UPDATE STATUS (With Certificate Trigger) ---
  const updateStatus = async (docId, participantIndex, newStatus) => {
    try {
      const studentObj = students.find(s => s.docId === docId && s.index === participantIndex);
      if (!studentObj) return;

      const updatedParticipants = [...studentObj.allParticipants];
      updatedParticipants[participantIndex].attendanceStatus = newStatus;
      
      await updateDoc(doc(db, "registrations", docId), { participants: updatedParticipants });
      alert("✅ Attendance status updated successfully");

      
    } catch (error) { 
        console.error("Error updating status:", error); 
    }
  };

  const onScannerMarked = async (scannedRegId) => {
    // 1. BLOCK IMMEDIATELY
    if (processingRef.current) return;
  processingRef.current = true;


const raw = scannedRegId.trim();

// If QR contains "REG-xxx-0" -> convert to "REG-xxx"
const parts = raw.split("-");
const cleanedRegId =
  parts.length === 3
    ? `${parts[0]}-${parts[1]}` // REG-1700000000000-0 => REG-1700000000000
    : raw;                      // REG-1700000000000 stays same

const registration = students.find(s => s.registrationId === cleanedRegId);

  if (registration) {

      if (registration.status === "Present") {
        alert("ℹ️ Attendance already marked for this student.");
        setScannerOpen(false);
        processingRef.current = false; // Release lock
        return;
      }

      try {
        const docRef = doc(db, "registrations", registration.docId);
        
        const updatedParticipants = registration.allParticipants.map(member => ({
            ...member,
            attendanceStatus: "Present"
        }));

        // 2. Perform Database Update
        await updateDoc(docRef, { participants: updatedParticipants });

        // 3. Trigger Function (This is where your previous CORS error was)
        console.log("QR Scan: Triggering Certificate for", registration.docId);
        
        
        alert(`✅ Attendance marked successfully.`);
      } catch (err) {
        console.error("Attendance Error:", err);
        alert("❌ Failed to update attendance.");
      } finally {
        setScannerOpen(false);
        // Keep the lock for 3 seconds to prevent double-scans from the camera feed
        setTimeout(() => { processingRef.current = false; }, 3000);
      }
    } else {
      alert("❌ Invalid Registration Ticket");
      setScannerOpen(false);
      processingRef.current = false; // Release lock
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setEventFilter("All");
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    const matchesEvent = eventFilter === "All" || s.eventName === eventFilter;
    return matchesSearch && matchesStatus && matchesEvent;
  });

  const releaseCertificates = async () => {
  if (eventFilter === "All") {
    alert("⚠️ Please select a specific event first");
    return;
  }
  setReleasing(true); // <--- ADD THIS (Turn loader ON)

  try {
    const result = await sendCertFunc({ eventName: eventFilter });

    alert(
      `🎓 Certificate Release Summary\n\n` +
      `Sent: ${result.data.sent}\n` +
      `Skipped: ${result.data.skipped}`
    );
  } catch (err) {
    console.error(err);
    alert("❌ Failed to release certificates");
  }finally{
    setReleasing(false); // <--- ADD THIS (Turn loader OFF)
  }
};

  return (
    <>
     <Sidebar 
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>

<Navbar 
  onMenuClick={() => setSidebarOpen(true)} 
/>

      <div className="page-content attendance-page">
        <h2 className="title-main">Attendance Management</h2>
        
        <div className="summary-row">
  <div className="stat-card total">
    <div className="stat-icon">👥</div>
    <div>
      <h3>{students.length}</h3>
      <p>Total Registered</p>
    </div>
  </div>

  <div className="stat-card present">
    <div className="stat-icon">✅</div>
    <div>
      <h3>{students.filter(s => s.status === "Present").length}</h3>
      <p>Marked Present</p>
    </div>
  </div>

  <div className="stat-card absent">
    <div className="stat-icon">❌</div>
    <div>
      <h3>{students.filter(s => s.status === "Absent").length}</h3>
      <p>Total Absent</p>
    </div>
  </div>

          <button className="scan-btn" onClick={() => setScannerOpen(true)}>Start QR Attendance Scan</button>

          <button 
  className="release-btn"
  onClick={releaseCertificates}
  disabled={releasing} // <--- This stops double-clicks while loading
  style={{ 
    background: releasing ? "#6c757d" : "#28a745", 
    color: "white", 
    padding: "12px 18px", 
    borderRadius: "8px",
    cursor: releasing ? "not-allowed" : "pointer",
    display: "flex",          /* Force flexbox */
    alignItems: "center",      /* Vertical center */
    justifyContent: "center",  /* Horizontal center */
    gap: "10px",               /* Space for loader */
    margin: "0 auto"           /* Center the button itself */
  }}
>
  {releasing ? (
    <>
      <span className="btn-loader"></span> Processing...
    </>
  ) : (
    "🎓 Release Certificates"
  )}
</button>
        </div>

        <div className="filters">
          <input 
            type="text" 
            className="search-bar" 
            placeholder="Search by Name or Email..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          <select className="status-dropdown" value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
            <option value="All">All Events</option>
            {eventOptions.map(ev => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
          </select>
          <select className="status-dropdown" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>
          <button className="reset-btn" onClick={handleReset} style={{ marginLeft: "10px", padding: "10px 20px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", background: "#006dff", color: "white" }}>
            Reset Filters
          </button>
        </div>

        <div className="card table-card">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Event</th>
                <th>Reg. Date & Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, idx) => (
                <tr key={`${s.docId}-${idx}`}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.eventName}</td>
                  <td style={{ fontSize: "0.85em" }}>{s.regDateTime}</td>
                  <td><span className={`badge ${s.status.toLowerCase()}`}>{s.status}</span></td>
                  <td>
                    <button className="present-btn" onClick={() => updateStatus(s.docId, s.index, s.status === "Present" ? "Absent" : "Present")}>
                      Toggle Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {scannerOpen && (
        <ScannerUI 
          eventId={eventFilter !== "All" ? eventFilter : "attendance_scan"} 
          onClose={() => setScannerOpen(false)} 
onMarked={(attendance) => onScannerMarked(attendance.studentId || attendance.payload?.token || "")}
        />
      )}
    </>
  );
}