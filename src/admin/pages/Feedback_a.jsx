// src/pages/Feedback_a.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar, Topbar } from "../components/UIComponents";
import "../styles/app.css";

// ⭐️ Ensure this path is correct relative to your firebase.js file ⭐️
import { 
    db, 
    collection, 
    query as firestoreQuery, 
    getDocs, 
    orderBy 
} from "../../firebase"; 


// Custom hook to parse URL query parameters
function useQuery() {
    return new URLSearchParams(useLocation().search);
}

// Helper function to format Firestore Timestamp/Date
const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    // Check if it's a Firestore Timestamp object
    if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric' 
        });
    }
    // Fallback for simple date strings
    return new Date(timestamp).toLocaleDateString();
};


export default function Feedback_a() {
        const [mobileOpen, setMobileOpen] = useState(false);
    
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const q = useQuery().get("q") || "";
    const query = q.trim().toLowerCase();

    const fetchFeedback = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const feedbackRef = collection(db, "feedback");
            // Sort by createdAt timestamp descending (newest first)
            const q = firestoreQuery(feedbackRef, orderBy("createdAt", "desc"));
            
            const querySnapshot = await getDocs(q);
            
            const fetchedFeedbacks = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // ⭐️ Improved name logic ⭐️
                const displayName = data.name || data.userEmail || "Anonymous User";

                return {
                    id: doc.id,
                    name: displayName,
                    event: data.event || "General Platform",
                    stars: data.stars || 0, 
                    text: data.text || "No comment provided",
                    // ⭐️ NEW: Include date for display ⭐️
                    createdAt: data.createdAt, 
                };
            });

            setFeedbacks(fetchedFeedbacks);

        } catch (err) {
            console.error("Error fetching feedback:", err);
            setError("Failed to load feedback. Check your database connection and security rules.");
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);


    const filtered = query
      ? feedbacks.filter(
            (f) =>
              f.name.toLowerCase().includes(query) ||
              f.event.toLowerCase().includes(query) ||
              f.text.toLowerCase().includes(query)
        )
      : feedbacks;

    return (
<div className="admin-scope app-layout">
<Sidebar 
  collapsed={!mobileOpen}
  className={mobileOpen ? "open" : ""} 
  onClose={() => setMobileOpen(false)} 
/>
           {/* 💡 UPDATE: Removed inline style to use CSS variables for layout */}
            <div className="main-layout"> 
<Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />
<main className="main-content_a feedback-main">
  <div className="page feedback-page">

    <div className="page-header">
      <h1>Feedback</h1>
    </div>

    {!loading && !error && filtered.length > 0 && (

      /* 🔥 THIS IS THE FIX */
      <div className="content-wrapper">
        <div className="cards-grid">
          {filtered.map((f) => (
            <div key={f.id} className="feedback-card">

              <div className="feedback-card">

  {/* NAME + STARS (same line) */}
  <div className="fb-top">
    <span className="fb-name">{f.name}</span>

    <span className="fb-stars">
      {"★".repeat(f.stars)}
      <span className="fb-stars-muted">
        {"★".repeat(5 - f.stars)}
      </span>
    </span>
  </div>

  {/* EVENT + DATE */}
  <div className="fb-row">
    <span className="fb-event">{f.event}</span>
    <span className="fb-date">{formatDate(f.createdAt)}</span>
  </div>

  {/* TEXT AT LAST */}
  <p className="fb-text">{f.text}</p>

</div>



            </div>
          ))}
        </div>
      </div>
    )}
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