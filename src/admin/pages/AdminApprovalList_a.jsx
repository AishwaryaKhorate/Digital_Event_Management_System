import React, { useEffect, useState } from "react";
import { Sidebar, Topbar } from "../components/UIComponents";
import "../styles/app.css";

// FIREBASE IMPORTS
import { getFunctions, httpsCallable } from "firebase/functions";
import { 
  collection, 
  query as firestoreQuery, 
  onSnapshot, 
  orderBy 
} from "firebase/firestore";
import { db } from "../../firebase.js";                                                           

export default function AdminApprovalList_a() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- FILTER STATES ---
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");

  const [rejectModal, setRejectModal] = useState(null);
const [approveLoading, setApproveLoading] = useState(false);
const [rejectLoading, setRejectLoading] = useState(false);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

  // Restoration of your preferred CSS Layout
  useEffect(() => {
    if (document.getElementById("ae-admin-approval-styles")) return;
    const css = `
      .ae-wrap { padding: 20px 28px; box-sizing: border-box; }
      .ae-header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
      .ae-title { margin:0; font-size:26px; font-weight:700; color:inherit; }
      .ae-filters-group { display: flex; gap: 10px; }
      .ae-filter-item { display: flex; flex-direction: column; gap: 4px; }
      .ae-filter-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
      .ae-filter-select { padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; outline: none; cursor: pointer; background: #fff; min-width: 140px; }
      .ae-stats { display:grid; grid-template-columns: repeat(4, 1fr); gap:14px; margin:12px 0 18px; }
      .ae-card { background:#fff; border-radius:10px; padding:14px; box-shadow:0 8px 20px rgba(15,23,36,0.04); cursor:pointer; border: 1px solid transparent; }
      .ae-card-active { border: 1px solid #1d4ed8; background: #f0f7ff; }
      .ae-card .label { font-size: 12px; color: #64748b; font-weight: 600; }
      .ae-card .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
      .ae-pill { padding:6px 10px; border-radius:999px; font-weight:700; font-size:12px; text-transform:capitalize; }
      .ae-pill.pending { background:#fff7ed; color:#92400e; }
      .ae-pill.approved { background:#ecfdf5; color:#065f46; }
      .ae-pill.rejected { background:#fff1f2; color:#9f1239; }
      .ae-actions-row { display:flex; gap:8px; align-items:center; }
      .ae-small { padding:6px 10px; border-radius:8px; font-weight:700; cursor:pointer; border:1px solid transparent; display: flex; align-items: center; justify-content: center; gap: 6px; }
      .ae-small.approve { background:#10b981; color:#fff; }
      .ae-small.reject { background:#ef4444; color:#fff; }
      .ae-modal-wrap { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; z-index:1200; background:rgba(15,23,42,0.55); }
      .ae-modal { background:#fff; border-radius:12px; max-width:400px; width:90%; padding:24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
      .ae-table th { text-align: left; padding: 12px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
      .ae-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: top; }
      .reason-box { font-size: 12px; color: #ef4444; font-weight: 600; max-width: 150px; line-height: 1.3; }
      .fee-item { font-size: 12px; margin-bottom: 2px; }

      /* Loading Spinner for buttons */
      .ae-loader {
        width: 12px;
        height: 12px;
        border: 2px solid #FFF;
        border-bottom-color: transparent;
        border-radius: 50%;
        display: inline-block;
        animation: aeRotation 1s linear infinite;
      }
      @keyframes aeRotation {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
        /* Add this inside your existing css string variable */
.ae-action-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  gap: 15px;
}
.ae-main-loader {
  width: 48px;
  height: 48px;
  border: 5px solid #1d4ed8;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  animation: aeRotation 1s linear infinite;
}
.ae-loader-text {
  font-weight: 700;
  color: #1e293b;
  font-size: 16px;
  font-family: inherit;
}
    `;
    const tag = document.createElement("style");
    tag.id = "ae-admin-approval-styles";
    tag.innerHTML = css;
    document.head.appendChild(tag);
  }, []);

  // DATA FETCHING
  useEffect(() => {
    const q = firestoreQuery(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvents(allData);
      setCounts({
        all: allData.length,
        pending: allData.filter(e => e.status === "pending").length,
        approved: allData.filter(e => e.status === "approved").length,
        rejected: allData.filter(e => e.status === "rejected").length,
      });
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // FILTERING
  useEffect(() => {
    let data = [...events];
    if (search) data = data.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()));
    if (category && category !== "all") data = data.filter(e => e.category?.toLowerCase() === category.toLowerCase());
    if (paymentFilter !== "all") {
      const isPaid = (e) => (e.soloPrice || e.duetPrice || e.groupPrice);
      data = data.filter(e => paymentFilter === "paid" ? isPaid(e) : !isPaid(e));
    }
    if (activeTab !== "all") data = data.filter(e => e.status === activeTab);
    setFilteredEvents(data);
  }, [search, category, paymentFilter, activeTab, events]);

 async function handleApprove(id) {
  if (approveLoading) return;

  const confirmApprove = window.confirm("Are you sure you want to approve this event?");
  if (!confirmApprove) return;

  setApproveLoading(true);
  try {
    const updateStatus = httpsCallable(getFunctions(), 'updateEventStatusSecure');
    await updateStatus({ eventId: id, status: "approved" });
  } catch (e) {
    alert("Error: " + e.message);
  } finally {
    setApproveLoading(false);
  }
}

  async function submitRejection() {
  if (!rejectModal || rejectLoading || !rejectModal.reason?.trim()) return;

  setRejectLoading(true);
  try {
    const updateStatus = httpsCallable(getFunctions(), 'updateEventStatusSecure');
    await updateStatus({
      eventId: rejectModal.id,
      status: "rejected",
      rejectionReason: rejectModal.reason
    });
    setRejectModal(null);
  } catch (e) {
    alert(e.message);
  } finally {
    setRejectLoading(false);
  }
}


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
          <div className="ae-wrap">
            <div className="ae-header-row">
              <h2 className="ae-title">Event Management</h2>
              <div className="ae-filters-group">
                <input 
                  className="ae-filter-select" 
                  placeholder="Search name..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                
                <select className="ae-filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="technical">Technical</option>
                  <option value="cultural">Cultural</option>
                  <option value="sports">Sports</option>
                  <option value="workshop">Workshop</option>
                  <option value="seminar">Seminar</option>
                  <option value="academic">Academic</option>
                  <option value="social">Social</option>
                  <option value="others">Others</option>
                </select>

                <select className="ae-filter-select" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                  <option value="all">All Fees</option>
                  <option value="paid">Paid</option>
                  <option value="free">Free</option>
                </select>
              </div>
            </div>

            <div className="ae-stats">
              {["all", "pending", "approved", "rejected"].map(tab => (
                <div key={tab} className={`ae-card ${activeTab === tab ? "ae-card-active" : ""}`} onClick={() => setActiveTab(tab)}>
                  <div className="label">{tab.toUpperCase()}</div>
                  <div className="value">{counts[tab]}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
              <table className="ae-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Event Details</th>
                    <th>Organizer</th>
                    <th>Venue & Timing</th>
                    <th>Description</th>
                    <th>Fees</th>
                    <th>Status</th>
                    {(activeTab === "pending" || activeTab === "rejected") && (
                      <th>{activeTab === "pending" ? "Actions" : "Reason"}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" style={{textAlign:'center', padding:'40px'}}>Loading...</td></tr>
                  ) : filteredEvents.length === 0 ? (
                    <tr><td colSpan="7" style={{textAlign:'center', padding:'40px'}}>No records found.</td></tr>
                  ) : (
                    filteredEvents.map(ev => (
                      <tr key={ev.id}>
                        <td data-label="Event Details">
  <div className="m-row">
    
    <div className="m-value">
      <div className="m-title">{ev.name}</div>
      
      <div className="event-category">
  {ev.category?.toUpperCase()}
</div>

    </div>
  </div>
</td>


                        <td data-label="Organizer">
  <div className="m-row">
   

    <div className="m-value">
      <b><div className="m-title">{ev.organizerName}</div></b>
      <div className="m-sub">{ev.organizerEmail}</div>
    
    </div>
  </div>
</td>


                        <td data-label="Venue & Timing">
  <div className="m-row">
   
   

    <div className="m-value">
      <b><div className="m-title">{ev.venue}</div></b>
      <div className="m-sub">
        {ev.date} | {ev.time}
      </div>
    </div>
  </div>
</td>



<td data-label="Description">
  <p className={`desc-text ${ev._expanded ? "expanded" : ""}`}>
    {ev.description}
  </p>

  {ev.description?.length > 120 && (
    <span
      className="read-more"
      onClick={() =>
        setFilteredEvents(prev =>
          prev.map(e =>
            e.id === ev.id ? { ...e, _expanded: !e._expanded } : e
          )
        )
      }
    >
      {ev._expanded ? "Read less" : "Read more"}
    </span>
  )}
</td>
                    <td data-label="Fees">
  {(!ev.soloPrice && !ev.duetPrice && !ev.groupPrice) ? (
    <span className="fee-free">Free</span>
  ) : (
    <div className="fees-list">
      {ev.soloPrice && (
        <div className="fee-row">
          <span className="fee-type">Solo</span>
          <span className="fee-price">₹{ev.soloPrice}</span>
        </div>
      )}
      {ev.duetPrice && (
        <div className="fee-row">
          <span className="fee-type">Duet</span>
          <span className="fee-price">₹{ev.duetPrice}</span>
        </div>
      )}
      {ev.groupPrice && (
        <div className="fee-row">
          <span className="fee-type">Group</span>
          <span className="fee-price">₹{ev.groupPrice}</span>
        </div>
      )}
    </div>
  )}
</td>


<td data-label="Status">
  <span className={`ae-pill ${ev.status}`}>
    {ev.status}
  </span>
</td>
                        
                        {activeTab === "pending" && (
                          <td>
                            <div className="ae-actions-row">
                              <button className="ae-small approve" onClick={() => handleApprove(ev.id)}>Approve</button>
                              <button className="ae-small reject" onClick={() => setRejectModal({id: ev.id, reason: ""})}>Reject</button>
                            </div>
                          </td>
                        )}
                        {activeTab === "rejected" && (
                          <td>
                            <div className="reason-box">{ev.rejectionReason || "No reason"}</div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
      

      {/* Reject Modal */}
      {rejectModal && (
        <div className="ae-modal-wrap">
          <div className="ae-modal">
            <h3>Reason for Rejection</h3>
            <textarea 
              style={{width: '100%', height: '80px', padding: '10px', marginTop: '10px', borderRadius: '8px', border: '1px solid #ddd', resize: 'none'}}
              placeholder="e.g. Please provide more event details or valid documents..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({...rejectModal, reason: e.target.value})} 
disabled={rejectLoading}
            />
            <div style={{display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'15px'}}>
              <button 
  style={{
    border: 'none',
    background: 'none',
    cursor: rejectLoading ? 'default' : 'pointer',
    color: '#64748b'
  }} 
  onClick={() => !rejectLoading && setRejectModal(null)}
>
  Cancel
</button>

              <button 
  className="ae-small reject" 
  onClick={submitRejection} 
  disabled={rejectLoading || !rejectModal.reason?.trim()}
>
  {rejectLoading && <span className="ae-loader"></span>}
  {rejectLoading ? "Submitting..." : "Submit"}
</button>

            </div>
          </div>
          
        </div>
      )}

{approveLoading && (
          <div className="ae-action-overlay">
          <div className="ae-main-loader"></div>
          <div className="ae-loader-text">Approving Event...</div>
        </div>
      )}
    </div>
  );
}