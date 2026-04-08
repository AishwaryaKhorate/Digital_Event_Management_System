import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import "./HighlightsUpload_o.css";
import { where } from "firebase/firestore";


import { db, storage, auth } from "../firebase";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export default function HighlightsUpload() {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Filters
  const [search, setSearch] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [eventFilter, setEventFilter] = useState("");
  
  // Event Data
  const [eventsList, setEventsList] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [newFile, setNewFile] = useState(null);
const [newTitle, setNewTitle] = useState("");

const [showEventModal, setShowEventModal] = useState(false);

  /* ======================
     AUTH + FETCH HIGHLIGHTS
     ====================== */
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    const q = query(collection(db, "highlights"), orderBy("createdAt", "desc"));
    const unsubSnap = onSnapshot(q, (snapshot) => {
      setHighlights(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubSnap();
    };
  }, []);

  /* ======================
     FETCH EVENTS
     ====================== */
 useEffect(() => {
  const fetchEvents = async () => {

    const q = query(
      collection(db, "events"),
      where("status", "==", "approved")
    );

    const snap = await getDocs(q);

    const allEvents = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const now = new Date();

    const completedEvents = allEvents.filter(event => {
      const eventDateTime = new Date(
        `${event.date}T${event.time || "00:00"}`
      );
      return eventDateTime < now;
    });

    setEventsList(completedEvents);
  };

  fetchEvents();
}, []);


  /* ======================
     UPLOAD LOGIC
     ====================== */
 const handleFiles = async (files) => {
  if (!files || files.length === 0 || !currentUser) return;

  setNewFile(files[0]);
  setShowEventModal(true);
};

const uploadHighlight = async () => {
  if (!newFile || !selectedEvent || !newTitle) {
    alert("Please select event, file and enter title");
    return;
  }

  setIsUploading(true);

  try {
    const storagePath = `highlights/${currentUser.uid}/${Date.now()}_${newFile.name}`;
    const fileRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(fileRef, newFile);
    const downloadURL = await getDownloadURL(snapshot.ref);

    await addDoc(collection(db, "highlights"), {
      title: newTitle,
      url: downloadURL,
      storagePath,
      type: newFile.type.startsWith("video") ? "video" : "image",
      uploadedBy: currentUser.uid,
      role: "organizer",
      eventId: selectedEvent.id,
      organizerId: currentUser.uid,
      createdAt: serverTimestamp(),
    });

    setShowEventModal(false);
    setNewFile(null);
    setNewTitle("");
    setSelectedEvent(null);

  } catch (err) {
    console.log(err);
    alert("Upload failed");
  } finally {
    setIsUploading(false);
  }
};


  /* ======================
     FILTER LOGIC (Same as Student)
     ====================== */
  const filteredHighlights = useMemo(() => {
    let data = [...highlights];

    if (search) {
      const term = search.toLowerCase();
      data = data.filter(item => item.title?.toLowerCase().includes(term));
    }

    if (eventFilter) {
      data = data.filter(item => item.eventId === eventFilter);
    }

    if (mediaType) {
      data = data.filter(item => item.type === mediaType);
    }

    if (activeTab === "official") {
      data = data.filter(item => item.role === "organizer");
    } else if (activeTab === "community") {
      data = data.filter(item => item.role !== "organizer");
    }

    return data;
  }, [highlights, search, mediaType, activeTab, eventFilter]);

  const eventsWithHighlights = useMemo(() => {
    const eventIds = [...new Set(highlights.filter(h => h.eventId).map(h => h.eventId))];
    return eventsList.filter(ev => eventIds.includes(ev.id));
  }, [highlights, eventsList]);

  /* ======================
     DELETE
     ====================== */
  const handleDelete = async (item) => {
    // Organizers can usually delete anything, or just their own. 
    // Here we allow deleting if they are the uploader.
    if (!window.confirm("Delete this highlight permanently?")) return;
    try {
      await deleteDoc(doc(db, "highlights", item.id));
      if (item.storagePath) {
        await deleteObject(ref(storage, item.storagePath));
      }
    } catch (err) {
      alert("Error deleting highlight");
    }
  };

  return (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

      <div className="page-content highlights-container">
        <h2 className="page-title">Event Highlights Management</h2>
        <p className="page-subtitle">Upload official media and manage community posts</p>

        {/* ================= UPLOAD AREA ================= */}
        <div className="card upload-card">
          <div
            className={`upload-box ${dragActive ? "drag-active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
onClick={() => setShowEventModal(true)}
          >
            <div className="upload-icon">{isUploading ? "⏳" : "⬆"}</div>
            <p>{isUploading ? "Uploading..." : "Click or Drag & Drop to upload Official Highlights"}</p>
          </div>
        </div>

        {/* ================= FILTERS (Matches Student) ================= */}
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search highlights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-input"
          />

          <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} className="filter-select">
            <option value="">All Media</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>

          <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className="filter-select">
            <option value="">All Events</option>
            {eventsWithHighlights.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>

          <button className="reset-btn-small" onClick={() => { setSearch(""); setMediaType(""); setActiveTab("all"); setEventFilter(""); }}>
            Reset
          </button>
        </div>

        {/* ================= TABS ================= */}
        <div className="tabs-main-wrapper">
          <div className="status-tabs-nav">
            <button className={`nav-tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
              All <span className="tab-badge">{filteredHighlights.length}</span>
            </button>
            <button className={`nav-tab-btn ${activeTab === "official" ? "active" : ""}`} onClick={() => setActiveTab("official")}>
              Official
            </button>
            <button className={`nav-tab-btn ${activeTab === "community" ? "active" : ""}`} onClick={() => setActiveTab("community")}>
              Community
            </button>
          </div>
        </div>

        {/* ================= GRID ================= */}
        {loading ? (
          <div className="shimmer-container">Loading...</div>
        ) : (
          <div className="highlight-grid">
            {filteredHighlights.map(item => (
              <div key={item.id} className="highlight-card effect-fade-in">
                <div className="media-preview">
                  {item.role === "organizer" && <div className="badge-official">Official</div>}

                  {item.type === "image" ? (
                    <img src={item.url} className="highlight-img" alt="" />
                  ) : (
                    <video className="highlight-img" muted>
                      <source src={item.url} />
                    </video>
                  )}

                  <div className="media-overlay" onClick={() => setModalItem(item)}>
                    <button className="overlay-view-btn">Full View</button>
                  </div>
                </div>

                <div className="highlight-info-footer">
                  <h4 className="item-name">{item.title}</h4>
                  <p className="item-role">{item.role === "organizer" ? "Official Media" : "Student Post"}</p>

                  <div className="btn-row">
                    <button className="delete-btn" onClick={() => handleDelete(item)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL ================= */}
      {modalItem && (
        <div className="premium-modal-overlay active" onClick={() => setModalItem(null)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <button className="close-x" onClick={() => setModalItem(null)}>✕</button>
            <div className="modal-media-wrap">
              {modalItem.type === "image" ? (
                <img src={modalItem.url} className="fullview-fit" alt="" />
              ) : (
                <video controls autoPlay className="fullview-fit">
                  <source src={modalItem.url} />
                </video>
              )}
            </div>
            <div className="modal-caption">
              <h3>{modalItem.title}</h3>
            </div>
          </div>
        </div>
      )}

      {showEventModal && (
  <div className="premium-modal-overlay active">
    <div className="upload-master-card">

      <h3>Upload Official Highlight</h3>

      {/* Event Dropdown */}
      <select
        value={selectedEvent?.id || ""}
        onChange={(e) => {
          const ev = eventsList.find(item => item.id === e.target.value);
          setSelectedEvent(ev);
        }}
      >
        <option value="">-- Select Event --</option>
        {eventsList.map(ev => (
          <option key={ev.id} value={ev.id}>{ev.name}</option>
        ))}
      </select>

      {/* Title */}
      <input
        placeholder="Enter Highlight Title"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
      />

      {/* File */}
      <input
        type="file"
        accept="image/*,video/*"
        onChange={(e) => setNewFile(e.target.files[0])}
      />

      {/* Buttons */}
      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>

        <button disabled={isUploading} onClick={uploadHighlight}>
          {isUploading ? "Uploading..." : "Upload Highlight"}
        </button>

        <button
          onClick={() => {
            setShowEventModal(false);
            setNewFile(null);
            setNewTitle("");
            setSelectedEvent(null);
          }}
        >
          Cancel
        </button>

      </div>

    </div>
  </div>
)}

    </>
  );
}