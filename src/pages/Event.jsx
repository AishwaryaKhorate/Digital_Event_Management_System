import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, getDocs } from "../firebase";
import { Search, Calendar, MapPin, Clock, ZoomIn, X, AlertCircle } from 'lucide-react'; 
import Navbar from "../components/Navbar_main.jsx";
import Footer from "../components/Footer_main.jsx";
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import "./Home.css";
import './Event.css';

const CATEGORIES = ["Technical", "Cultural", "Sports", "Workshop", "Seminar", "Academic", "Social", "Others"];
const DATES = ["Upcoming 7 Days", "This Month", "Next Month", "All Dates"];

const Event = () => {
    const [events, setEvents] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedDates, setSelectedDates] = useState(["All Dates"]);
    const [showFreeOnly, setShowFreeOnly] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    
    const navigate = useNavigate();
    const auth = getAuth();
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
    // 1. Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, [auth]);

    // 2. Data Fetching
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "events"));
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEvents(data);
            } catch (error) {
                console.error("Firebase Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    // 🛡️ SECURITY LOGIC: Handle Registration
const handleRegisterClick = (event, isFull) => {
  if (isFull) {
    alert("This event is already full!");
    return;
  }

  alert("Please login or signup to register for this event.");
  navigate("/signup");   // redirect AFTER OK
};



    // 3. Filtering Logic
    const checkDateMatch = (eventDateStr, filter) => {
        if (filter === "All Dates") return true;
        const eventDate = new Date(eventDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filter === "Upcoming 7 Days") {
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            return eventDate >= today && eventDate <= nextWeek;
        }
        if (filter === "This Month") {
            return eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
        }
        if (filter === "Next Month") {
            const nextMonth = new Date();
            nextMonth.setMonth(today.getMonth() + 1);
            return eventDate.getMonth() === nextMonth.getMonth() && eventDate.getFullYear() === nextMonth.getFullYear();
        }
        return false;
    };

    const filteredEvents = useMemo(() => {
        const now = new Date();
        return events.filter(ev => {
            const isApproved = ev.status?.toLowerCase() === "approved";
            const eventDateTime = new Date(`${ev.date}T${ev.time || "00:00"}`);
            const isPast = eventDateTime < now;
            
            const matchesSearch = !searchTerm || ev.name?.toLowerCase().includes(searchTerm.toLowerCase());
const matchesCategory =
  selectedCategories.length === 0 ||
  selectedCategories.some(
    cat => cat.trim().toLowerCase() === (ev.category || "").trim().toLowerCase()
  );
            const matchesDate = selectedDates.includes("All Dates") || selectedDates.some(f => checkDateMatch(ev.date, f));
            
            const isFree = ev.paymentType === 'free' || (!ev.soloPrice && !ev.duetPrice && !ev.groupPrice);
            const matchesPricing = !showFreeOnly || isFree;

            return isApproved && !isPast && matchesSearch && matchesCategory && matchesDate && matchesPricing;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [events, searchTerm, selectedCategories, selectedDates, showFreeOnly]);

    const handleReset = () => {
        setSearchTerm('');
        setSelectedCategories([]);
        setSelectedDates(["All Dates"]);
        setShowFreeOnly(false);
    };

    if (loading) return <div className="loader-container"><div className="loader"></div></div>;

    return (
        <div className="event-page-wrapper">
            <Navbar />
            <div className="content-container">
                <div className="layout-grid">
                    {/* Sidebar Filters */}
                    <aside className="sidebar-filter">
                        <div className="sidebar-header"><h2>Filter Events</h2></div>
                        <div className="filter-block">
                            <label>Search Events</label>
                            <div className="search-input-group">
                                <Search size={18} />
                                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="filter-block">
                            <label className="filter-label">PRICING</label>
                            <label className="date-item">
                                <input type="checkbox" className="custom-checkbox" checked={showFreeOnly} onChange={() => setShowFreeOnly(!showFreeOnly)} />
                                <span className="checkbox-text"> Free Only</span>
                            </label>
                        </div>
                        <div className="filter-block">
                            <label>Categories</label>
                            <div className="category-flex">
                                {CATEGORIES.map(cat => (
                                   <button
  type="button"   // ✅ VERY IMPORTANT
  key={cat}
  className={`cat-tag ${selectedCategories.includes(cat) ? 'is-active' : ''}`}
  onClick={() =>
    setSelectedCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    )
  }
>
  {cat}
</button>

                                ))}
                            </div>
                        </div>
                        <div className="filter-block">
                            <label className="filter-label">DATE RANGE</label>
                            <div className="date-list">
                                {DATES.map(date => (
                                    <label key={date} className="date-item">
                                        <input type="checkbox" className="custom-checkbox" 
                                            checked={selectedDates.includes(date)} 
                                            onChange={() => setSelectedDates(prev => {
                                                if(date === "All Dates") return ["All Dates"];
                                                const filtered = prev.filter(d => d !== "All Dates");
                                                return filtered.includes(date) ? filtered.filter(d => d !== date) : [...filtered, date];
                                            })} 
                                        />
                                        <span className="checkbox-text">{date}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button className="reset-filter-link" onClick={handleReset}>Reset All Filters</button>
                    </aside>

                    {/* Events Main View */}
                    <section className="events-main-view">
                        <div className="pro-grid-3">
                            {filteredEvents.length > 0 ? filteredEvents.map(event => {
                                // SEAT CALCULATIONS
                                const maxSeats = parseInt(event.maxSeats) || 0;
                                const currentRegs = event.currentRegistrations || 0;
                                const isFull = maxSeats > 0 && currentRegs >= maxSeats;
                                const available = maxSeats > 0 ? (maxSeats - currentRegs) : null;
                                const isFree = event.paymentType === 'free' || (!event.soloPrice && !event.duetPrice && !event.groupPrice);

                                return (
                                    <div key={event.id} className={`pro-event-card ${isFull ? "card-is-full" : ""}`}>
                                        <div className="card-thumb">
                                            <img src={event.posterURL || "https://placehold.co/600x400?text=Event+Poster"} alt={event.name} />
                                            <div className="zoom-overlay" onClick={() => setZoomedImage(event.posterURL)}>
                                                <ZoomIn color="white" size={24} />
                                            </div>
                                            <span className="cat-tag-overlay">{event.category}</span>
                                            {isFree && <div className="free-badge-overlay">FREE</div>}
{isFull && (
        <div className="seats-full-overlay">
            <div className="seats-full-badge">SEATS FULL</div>
        </div>
    )}
                                            </div>
                                        
                                        <div className="card-details">
                                            <h3 className="event-title-text">{event.name}</h3>
                                            
                                            {/* Explore-style Seat Indicator */}
                                            <div className="seat-status-indicator">
                                                {isFull ? (
                                                    <span className="status-full">⚠️ Registration Closed</span>
                                                ) : available !== null ? (
                                                    <span className="status-available">🔥 Only {available} seats left</span>
                                                ) : (
                                                    <span className="status-open">✅ Seats Available</span>
                                                )}
                                            </div>

                                                                              <DescriptionToggle text={event.description} />


                                            <div className="event-meta-info">
                                                <div className="meta-row"><Calendar size={14} /> <span>{event.date}</span></div>
                                                <div className="meta-row"><Clock size={14} /> <span>{event.time || "TBA"}</span></div>
                                                <div className="meta-row"><MapPin size={14} /> <span>{event.venue}</span></div>
                                                
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

                                            <button 
                                                className={`primary-action-btn ${isFull ? 'disabled' : ''}`}
                                                onClick={() => handleRegisterClick(event, isFull)}
                                            >
                                                {isFull ? "Seats Full" : "Register Now"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="no-results-container">
                                    <AlertCircle size={48} />
                                    <p>No upcoming events found matching your criteria.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Lightbox for Images */}
            {zoomedImage && (
                <div className="image-lightbox-overlay" onClick={() => setZoomedImage(null)}>
                    <button className="close-lightbox" onClick={() => setZoomedImage(null)}><X size={32} /></button>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Zoomed" />
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
};

export default Event;