import React, { useState, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import "./explore.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/navbar";
import { useEvents } from '../hooks/useEvents';
import { X, ZoomIn } from 'lucide-react';

const CATEGORIES = [
  { label: "Technical", value: "technical" },
  { label: "Cultural", value: "cultural" },
  { label: "Sports", value: "sports" },
  { label: "Workshop", value: "workshop" },
  { label: "Seminar", value: "seminar" },
  { label: "Academic", value: "academic" },
  { label: "Social", value: "social" },
  { label: "Others", value: "others" }
];

const DATES = ["All", "Today", "This Week", "This Month"];

const DescriptionToggle = ({ text }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLongText = text && text.length > 85;

    return (
        <div style={{ marginBottom: '10px' }}>
            <p className={`event-description-text ${isExpanded ? 'expanded' : ''}`}>
                {text || "Join us for this exciting event!"}
            </p>
            {isLongText && (
                <button 
                    className="read-more-btn" 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                >
                    {isExpanded ? "Show Less ↑" : "Read More ↓"}
                </button>
            )}
        </div>
    );
};
export default function Explore() {
  const navigate = useNavigate();
  const { events, loading, error } = useEvents();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dateFilter, setDateFilter] = useState("All");
  const [priceFilter, setPriceFilter] = useState("");
  const [zoomedImage, setZoomedImage] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming"); 
  const [currentTime, setCurrentTime] = useState(new Date()); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toStartOfDay = (dateValue) => {
    const date = new Date(dateValue);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const { upcoming, past } = useMemo(() => {
    let data = events.filter(e => e.status === "approved");

    if (search) {
      const term = search.toLowerCase();
      data = data.filter(e => 
        (e.name || e.title || "").toLowerCase().includes(term) ||
        (e.venue || e.location || "").toLowerCase().includes(term)
      );
    }

    if (category) {
      data = data.filter(e => e.category === category);
    }

    if (priceFilter) {
      data = data.filter(e => {
        const isEventFree = e.paymentType === "free" || (!e.soloPrice && !e.duetPrice && !e.groupPrice);
        return priceFilter === "free" ? isEventFree : !isEventFree;
      });
    }

    if (dateFilter !== "All") {
      const today = toStartOfDay(new Date());
      data = data.filter((ev) => {
        const eventDate = toStartOfDay(ev.date);
        if (dateFilter === "Today") return eventDate.getTime() === today.getTime();
        if (dateFilter === "This Week") {
          const nextWeek = new Date(today);
          nextWeek.setDate(today.getDate() + 7);
          return eventDate >= today && eventDate <= nextWeek;
        }
        if (dateFilter === "This Month") {
          return eventDate.getMonth() === today.getMonth() && 
                 eventDate.getFullYear() === today.getFullYear();
        }
        return true;
      });
    }

    const upcomingList = [];
    const pastList = [];

    data.forEach(event => {
      const eventDateTime = new Date(`${event.date}T${event.time || "00:00"}`);
      if (eventDateTime >= currentTime) {
        upcomingList.push(event);
      } else {
        pastList.push(event);
      }
    });

    return {
      upcoming: upcomingList.sort((a, b) => new Date(a.date) - new Date(b.date)),
      past: pastList.sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  }, [events, search, category, dateFilter, priceFilter, currentTime]);

  if (loading) return <div className="explore-container"><h3>Loading Events...</h3></div>;
  if (error) return <div className="explore-container"><h3>Error: {error}</h3></div>;

  return (
  
      <>
  <Sidebar 
    isOpen={isSidebarOpen} 
    onClose={() => setIsSidebarOpen(false)} 
  />

  <Navbar 
    onSearch={setSearch} 
    onMenuClick={() => setIsSidebarOpen(true)} 
  />


      <div className="explore-container">
        <h2 className="explore-title">Explore Events</h2>

        <div className="filter-row">
          <div className="search-wrapper">
            <svg width="18" height="18" className="search-svg" fill="none" stroke="#555" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="16" y1="16" x2="22" y2="22"></line>
            </svg>
            <input
              type="text"
              placeholder="Search event name or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
          </select>

          <select className="filter-select" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
            <option value="">All Payments</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>

          <select className="filter-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            {DATES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <button className="reset-btn-small" onClick={() => {
            setSearch(""); setCategory(""); setPriceFilter(""); setDateFilter("All");
          }}>Reset</button>
        </div>

        <div className="tabs-main-wrapper">
          <div className="status-tabs-nav">
            <button 
              className={`nav-tab-btn ${activeTab === "upcoming" ? "active" : ""}`} 
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming Events <span className="tab-badge">{upcoming.length}</span>
            </button>
            <button 
              className={`nav-tab-btn ${activeTab === "past" ? "active" : ""}`} 
              onClick={() => setActiveTab("past")}
            >
              Past Events <span className="tab-badge">{past.length}</span>
            </button>
          </div>
        </div>

        <div className="explore-grid">
          {(activeTab === "upcoming" ? upcoming : past).length > 0 ? (
            (activeTab === "upcoming" ? upcoming : past).map((event) => {
              const isFree = event.paymentType === "free" || 
                             (!event.soloPrice && !event.duetPrice && !event.groupPrice);
              
              const imgURL = event.posterURL || event.poster || "https://placehold.co/600x400?text=No+Poster";

              // 🛡️ SEAT LOGIC
              const maxSeats = parseInt(event.maxSeats) || 0;
              const currentRegs = event.currentRegistrations || 0;
              const isFull = maxSeats > 0 && currentRegs >= maxSeats;
              const available = maxSeats > 0 ? (maxSeats - currentRegs) : null;

              return (
                <div className={`event-card ${isFull ? "card-is-full" : ""}`} key={event.id}>
                  <div className="event-img-container">
                    <img src={imgURL} className="event-img" alt={event.name} />
                    <div className="zoom-overlay" onClick={() => setZoomedImage(imgURL)}>
                        <ZoomIn color="white" size={24} />
                    </div>
                    <span className="cat-tag-overlay">{event.category}</span>
                    {isFree && <div className="free-badge-overlay">FREE</div>}
                    
                    {/* SEATS FULL BADGE */}
                    {isFull && activeTab === "upcoming" && (
                      <div className="seats-full-overlay">
                      <div className="seats-full-badge">SEATS FULL</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="event-content">
                    <br />
                    <h4 className="event-title">{event.name || event.title}</h4>

                    {/* SEAT INDICATOR */}
                    {activeTab === "upcoming" && (
                       <div className="seat-status-indicator">
                          {isFull ? (
                            <span className="status-full">⚠️ Registration Closed</span>
                          ) : available !== null ? (
                            <span className="status-available">🔥 Only {available} seats left</span>
                          ) : (
                            <span className="status-open">✅ Seats Available</span>
                          )}
                       </div>
                    )}

                                    <DescriptionToggle text={event.description} />

                    <div className="event-info-rows">
                      <p className="info-item">📅 {event.date}</p>
                      <p className="info-item">⏰ {event.time || "N/A"}</p>
                      <p className="info-item">📍 {event.venue || event.location}</p>
                      
                      <div className="multi-price-container">
                        {isFree ? (
                          <p className="price-item free">💰 Free Entry</p>
                        ) : (
                          <div className="price-stack">
                            {event.soloPrice && <p className="price-item">👤 Solo: ₹{event.soloPrice}</p>}
                            {event.duetPrice && <p className="price-item">👥 Duet: ₹{event.duetPrice}</p>}
                            {event.groupPrice && <p className="price-item">👨‍👩‍👧‍👦 Group: ₹{event.groupPrice}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="event-card-footer">
                      {activeTab === "past" ? (
                        <div className="completed-status-label">COMPLETED</div>
                      ) : (
                        <button 
                          className={`event-btn ${isFull ? "disabled-btn" : ""}`} 
                          onClick={() => !isFull && navigate(`/register?eventId=${event.id}`)}
                          disabled={isFull}
                        >
                          {isFull ? "Seats Full" : "Register Now"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="no-results">No events found matching your criteria.</p>
          )}
        </div>
      </div>

      {zoomedImage && (
                      <div className="image-lightbox-overlay" onClick={() => setZoomedImage(null)}>
                          <button className="close-lightbox" onClick={() => setZoomedImage(null)}><X size={32} /></button>
                          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                              <img src={zoomedImage} alt="Zoomed" />
                          </div>
                      </div>
                  )}
    </>
  );
}