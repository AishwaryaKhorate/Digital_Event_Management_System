import { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/navbar";
import "./highlight.css";

// Firebase
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
  where,
  serverTimestamp
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

export default function Highlights() {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // 🔑 NEW (required for notifications)
  const [eventsList, setEventsList] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
const [mediaType, setMediaType] = useState("");
const [activeTab, setActiveTab] = useState("all"); // all | official | community
const [eventFilter, setEventFilter] = useState("");

  /* ================= FETCH ALL HIGHLIGHTS ================= */
  useEffect(() => {
    const q = query(
      collection(db, "highlights"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => item.url && item.url.trim() !== "");

      setHighlights(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

/* ================= FETCH ONLY PAST (COMPLETED) EVENTS ================= */
  useEffect(() => {
    const fetchEvents = async () => {
      // 1. Fetch all approved events first
      const q = query(
        collection(db, "events"),
        where("status", "==", "approved")
      );
      
      const snap = await getDocs(q);
      const allEvents = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 2. Get the current time
      const now = new Date();

      // 3. Filter using the exact logic from your Explore page
      const pastEvents = allEvents.filter(event => {
        // Combines event date and time into a comparable object
        const eventDateTime = new Date(`${event.date}T${event.time || "00:00"}`);
        return eventDateTime < now; 
      });

      setEventsList(pastEvents);
    };

    fetchEvents();
  }, []);
  /* ================= ADD HIGHLIGHT (STUDENT ONLY) ================= */
  const addHighlight = async () => {
    if (!newTitle || !newFile || !auth.currentUser || !selectedEvent) {
      alert("Please select event, title and file");
      return;
    }

    setIsUploading(true);

    try {
      const storagePath = `highlights/${auth.currentUser.uid}/${Date.now()}_${newFile.name}`;
      const fileRef = ref(storage, storagePath);
      const snap = await uploadBytes(fileRef, newFile);
      const downloadURL = await getDownloadURL(snap.ref);

      await addDoc(collection(db, "highlights"), {
        title: newTitle,
        url: downloadURL,
        storagePath,
        type: newFile.type.startsWith("video") ? "video" : "image",
        createdAt: serverTimestamp(),

        // 🔑 REQUIRED FOR CLOUD FUNCTION
        role: "student",
        uploadedBy: auth.currentUser.uid,
        eventId: selectedEvent.id,
        organizerId: selectedEvent.organizerId
      });

      closeUploadModal();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };


 const filteredHighlights = useMemo(() => {
  let data = [...highlights];

  // 🔍 Search filter
  if (search) {
    const term = search.toLowerCase();
    data = data.filter(item =>
      item.title?.toLowerCase().includes(term)
    );
  }

  // 🎯 Event filter
  if (eventFilter) {
    data = data.filter(item => item.eventId === eventFilter);
  }

  // 🎭 Media Type filter
  if (mediaType) {
    data = data.filter(item => item.type === mediaType);
  }

  // 🏷 Role Tabs
  if (activeTab === "official") {
    data = data.filter(item => item.role === "organizer");
  } else if (activeTab === "community") {
    data = data.filter(item => item.role !== "organizer");
  }

  return data;
}, [highlights, search, mediaType, activeTab, eventFilter]);


const eventsWithHighlights = useMemo(() => {
  const eventIds = [...new Set(
    highlights
      .filter(h => h.eventId)
      .map(h => h.eventId)
  )];

  return eventsList.filter(ev => eventIds.includes(ev.id));
}, [highlights, eventsList]);


  /* ================= DELETE (ONLY OWN STUDENT POSTS) ================= */
  const deleteHighlight = async (item) => {
    if (
      item.uploadedBy !== auth.currentUser?.uid ||
      item.role !== "student"
    ) {
      alert("You are not allowed to delete this highlight");
      return;
    }

    if (!window.confirm("Delete this highlight?")) return;

    try {
      await deleteDoc(doc(db, "highlights", item.id));
      if (item.storagePath) {
        await deleteObject(ref(storage, item.storagePath));
      }
    } catch (err) {
      alert("Failed to delete highlight");
    }
  };

  const closeUploadModal = () => {
    setShowModal(false);
    setNewTitle("");
    setNewFile(null);
    setSelectedEvent(null);
  };

  return (
    <>
     <Sidebar 
         isOpen={isSidebarOpen} 
         onClose={() => setIsSidebarOpen(false)} 
       />
     
       
<Navbar onMenuClick={() => setIsSidebarOpen(true)} />
       

      <div className="page-content highlights-container">
        <div className="highlight-header-row">
          <div>
            <h2 className="page-title">Event Highlights</h2>
            <p className="page-subtitle">Relive the best moments</p>
          </div>

          <button
            className="add-highlight-btn"
            onClick={() => setShowModal(true)}
          >
            + Share a Moment
          </button>
        </div>

<div className="filter-row">
  <input
    type="text"
    placeholder="Search highlights..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="filter-input"
  />

  <select
    value={mediaType}
    onChange={(e) => setMediaType(e.target.value)}
    className="filter-select"
  >
    <option value="">All Media</option>
    <option value="image">Images</option>
    <option value="video">Videos</option>
  </select>

<select
  value={eventFilter}
  onChange={(e) => setEventFilter(e.target.value)}
  className="filter-select"
>
  <option value="">All Events</option>
  {eventsWithHighlights.map(ev => (
    <option key={ev.id} value={ev.id}>{ev.name}</option>
  ))}
</select>

  <button
    className="reset-btn-small"
    onClick={() => {
  setSearch("");
  setMediaType("");
  setActiveTab("all");
  setEventFilter("");
}}

  >
    Reset
  </button>
</div>


<div className="tabs-main-wrapper">
  <div className="status-tabs-nav">
    <button
      className={`nav-tab-btn ${activeTab === "all" ? "active" : ""}`}
      onClick={() => setActiveTab("all")}
    >
All <span className="tab-badge">{filteredHighlights.length}</span>
    </button>

    <button
      className={`nav-tab-btn ${activeTab === "official" ? "active" : ""}`}
      onClick={() => setActiveTab("official")}
    >
      Official
    </button>

    <button
      className={`nav-tab-btn ${activeTab === "community" ? "active" : ""}`}
      onClick={() => setActiveTab("community")}
    >
      Community
    </button>
  </div>
</div>

{eventFilter && (
  <p className="active-filter-label">
    Showing highlights for selected event
  </p>
)}

        {loading ? (
          <div className="shimmer-container">Loading...</div>
        ) : (
          <div className="highlight-grid">
{filteredHighlights.map(item => {
              const role = item.role || "student";

              return (
                <div className="highlight-card effect-fade-in" key={item.id}>
                  <div className="media-preview">
                    {role === "organizer" && (
                      <div className="badge-official">Official</div>
                    )}

                    {item.type === "image" ? (
                      <img src={item.url} className="highlight-img" alt="" />
                    ) : (
                      <video className="highlight-img" muted>
                        <source src={item.url} />
                      </video>
                    )}

                    <div
                      className="media-overlay"
                      onClick={() => setModalItem(item)}
                    >
                      <button className="overlay-view-btn">Full View</button>
                    </div>
                  </div>

                  <div className="highlight-info-footer">
                    <h4 className="item-name">{item.title}</h4>
                    <p className="item-role">
                      {role === "organizer"
                        ? "Official Event Media"
                        : "Community Post"}
                    </p>

                    {item.uploadedBy === auth.currentUser?.uid &&
                      role === "student" && (
                        <button
                          className="delete-highlight-btn"
                          onClick={() => deleteHighlight(item)}
                        >
                          Delete
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= FULL VIEW MODAL ================= */}
      {modalItem && (
        <div
          className="premium-modal-overlay active"
          onClick={() => setModalItem(null)}
        >
          <div className="modal-inner" onClick={e => e.stopPropagation()}>
            <button className="close-x" onClick={() => setModalItem(null)}>
              ✕
            </button>

            {modalItem.type === "image" ? (
              <img src={modalItem.url} className="fullview-fit" />
            ) : (
              <video controls autoPlay className="fullview-fit">
                <source src={modalItem.url} />
              </video>
            )}
          </div>
        </div>
      )}

      {/* ================= UPLOAD MODAL ================= */}
      {showModal && (
        <div className="premium-modal-overlay active" onClick={closeUploadModal}>
          <div className="upload-master-card" onClick={e => e.stopPropagation()}>
            <button className="close-x" onClick={closeUploadModal}>✕</button>

            <h3>Share a New Moment</h3>

            {/* 🔑 EVENT SELECT (NEW) */}
            <select
              className="event-input"
              value={selectedEvent?.id || ""}
              onChange={(e) => {
                const ev = eventsList.find(item => item.id === e.target.value);
                setSelectedEvent(ev);
              }}
            >
              <option value="" disabled>-- Select Event --</option>
              {eventsList.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>

            <input
              placeholder="Moment title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />

            <input
              type="file"
              accept="image/*,video/*"
              onChange={e => setNewFile(e.target.files[0])}
            />

            <div className="upload-card-footer">
              <button className="btn-cancel-link" onClick={closeUploadModal}>
                Cancel
              </button>

              <button
                className="btn-save-premium"
                onClick={addHighlight}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
