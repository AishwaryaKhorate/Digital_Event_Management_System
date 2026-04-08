import "./home_stud.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/navbar";
import "../index.css";
import React, { useState, useEffect, createContext } from 'react';
import { useNavigate } from "react-router-dom";
import { auth, db, onAuthStateChanged, doc, getDoc, collection, query, orderBy, limit, onSnapshot } from '../firebase'; 
import { useEvents } from "../hooks/useEvents"; 
import { X, ZoomIn } from 'lucide-react'; 

const DashboardContext = createContext();


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
const useAuth = () => {
    const [userName, setUserName] = useState("Student"); 
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userRef = doc(db, "users", user.uid);
                try {
                    const snap = await getDoc(userRef);
                    if (snap.exists() && snap.data().name) {
                        setUserName(snap.data().name);
                    } else {
                        setUserName(user.displayName || "Valued User");
                    }
                } catch (error) {
                    setUserName(user.displayName || "Valued User"); 
                }
            } else {
                setUserName("Guest");
            }
            setLoadingAuth(false);
        });
        return () => unsubscribeAuth();
    }, []);
    return { name: userName, loadingAuth };
};

const useDashboardStatsAndActivity = () => {
    const [stats, setStats] = useState({ attended: 0, certificates: 0, rating: 0 });
    const [recentActivity, setRecentActivity] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setIsLoading(false);
            return;
        }

        const statsRef = doc(db, "users", user.uid);
        const unsubscribeStats = onSnapshot(statsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats({
                    attended: data.attendedCount || 0,
                    certificates: data.certificatesCount || 0,
                    rating: data.averageRating || 0
                });
            }
            setIsLoading(false);
        });

        const activityRef = collection(db, "users", user.uid, "activities");
        const activityQuery = query(activityRef, orderBy("timestamp", "desc"), limit(5));
        
        const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
            const activities = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: doc.data().timestamp?.toDate().toLocaleDateString() || "Recently"
            }));
            setRecentActivity(activities);
        });

        return () => {
            unsubscribeStats();
            unsubscribeActivity();
        };
    }, []);

    return { stats, recentActivity, isLoading };
};

export default function Home_student() {
    const { name: userName, loadingAuth } = useAuth(); 
    const navigate = useNavigate();
    const { events: upcomingEvents, loading: eventsLoading } = useEvents(); 
    const { stats, recentActivity, isLoading: statsLoading } = useDashboardStatsAndActivity(); 
    const [searchQuery, setSearchQuery] = useState(''); 
    const [zoomedImage, setZoomedImage] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const isLoading = eventsLoading || statsLoading || loadingAuth;

    const renderIcon = (iconName) => {
        const icons = {
            'GraduationCap': <svg width="30" height="30" fill="none" stroke="#1a73e8" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10L12 4 2 10l10 6 10-6z"></path><path d="M6 12v6l6 3 6-3v-6"></path></svg>,
            'Certificate': <svg width="30" height="30" fill="none" stroke="#1a73e8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M6 14v7l6-3 6 3v-7"></path></svg>,
            'Star': <svg width="30" height="30" fill="none" stroke="#1a73e8" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"></path></svg>,
            'Calendar': <svg width="18" height="18" fill="none" stroke="#1a73e8" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>,
        };
        return icons[iconName] || icons['Calendar'];
    };

    const filteredEvents = upcomingEvents.filter(event => {
        const isApproved = event.status === "approved";
        const eventDateTime = new Date(`${event.date}T${event.time || "00:00"}`);
        const isUpcoming = eventDateTime > currentTime;
        const matchesSearch = 
            (event.name || event.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.venue || event.location || "").toLowerCase().includes(searchQuery.toLowerCase());

        return isApproved && isUpcoming && matchesSearch;
    });
    
    const sortedEvents = [...filteredEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
        <DashboardContext.Provider value={{ searchQuery, setSearchQuery }}>
{/* NAVBAR */}
<Navbar onMenuClick={() => setSidebarOpen(true)} />

{/* SIDEBAR */}
<Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

{/* OVERLAY */}
<div
  className={`sidebar-overlay ${isSidebarOpen ? "show" : ""}`}
  onClick={() => setSidebarOpen(false)}
></div>

            <div className="home-page">
                <h2 className="welcome">Welcome, {loadingAuth ? '...' : userName.split(' ')[0]}!</h2> 
                <p className="overview-title">Your Dashboard Overview</p>

                <div className="stats-grid">
                    <div className="stat-card">
                        {renderIcon('GraduationCap')}
                        <p className="stat-label">Attended Events</p>
                        <h3 className="stat-value">{isLoading ? '...' : stats.attended}</h3>
                    </div>
                    <div className="stat-card">
                        {renderIcon('Certificate')}
                        <p className="stat-label">Certificates</p>
                        <h3 className="stat-value">{isLoading ? '...' : stats.certificates}</h3>
                    </div>
                    <div className="stat-card">
                        {renderIcon('Star')}
                        <p className="stat-label">Avg Rating</p>
                        <h3 className="stat-value">{isLoading ? '...' : stats.rating}</h3>
                    </div>
                </div>

                <h3 className="section-title">Recent Feedbacks</h3>
<div className="activity-box"> {/* This div now has the scrollbar */}
    {recentActivity.length === 0 ? (
        <p className="info-message">No recent activity.</p>
    ) : (
        recentActivity.map(activity => (
            <div key={activity.id} className="activity-row">
                {renderIcon(activity.icon)}
                <span className="activity-text" dangerouslySetInnerHTML={{ __html: activity.text }} />
                <span className="activity-time">{activity.time}</span>
            </div>
        ))
    )}
</div>

                <h3 className="section-title">Upcoming Events</h3>
                <div className="events-grid">
                    {eventsLoading ? <div className="loader">Loading Events...</div> : 
                        sortedEvents.map(event => {
                            const isFree = event.paymentType === "free" || 
                                (!event.soloPrice && !event.duetPrice && !event.groupPrice);

                            const imgURL = event.posterURL || event.poster || "https://placehold.co/600x400?text=No+Poster";

                            // Seat Logic
                            const maxSeats = parseInt(event.maxSeats) || 0;
                            const currentRegs = event.currentRegistrations || 0;
                            const isFull = maxSeats > 0 && currentRegs >= maxSeats;
                            const available = maxSeats > 0 ? (maxSeats - currentRegs) : null;

                            return (
                                <div key={event.id} className={`event-card ${isFull ? "card-is-full" : ""}`}>
                                    <div className="event-img-container">
                                        <img src={imgURL} className="event-img" alt={event.name} />
                                        <div className="zoom-overlay" onClick={() => setZoomedImage(imgURL)}>
                                            <ZoomIn color="white" size={24} />
                                        </div>
                                        <span className="cat-tag-overlay">{event.category}</span>
                                        {isFree && <div className="free-badge-overlay">FREE</div>}
{isFull && (
        <div className="seats-full-overlay">
            <div className="seats-full-badge">SEATS FULL</div>
        </div>
    )}                                    </div>
                                    
                                    <div className="event-content">
                                        <br />
                                        <h4 className="event-title">{event.name || event.title}</h4>

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
                                            <button 
                                                className={`event-btn ${isFull ? "disabled-btn" : ""}`} 
                                                onClick={() => !isFull && navigate(`/register?eventId=${event.id}`)}
                                                disabled={isFull}
                                            >
                                                {isFull ? "Seats Full" : "Register Now"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>

            {zoomedImage && (
                <div className="image-lightbox-overlay" onClick={() => setZoomedImage(null)}>
                    <button className="close-lightbox" onClick={() => setZoomedImage(null)}><X size={32} /></button>
                    <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                        <img src={zoomedImage} alt="Zoomed Poster" />
                    </div>
                </div>
            )}
        </DashboardContext.Provider>
    );
}