import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "./FeedbackRatings_o.css";

export default function FeedbackRatings() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Query to get feedback specifically for events created by this organizer
        const q = query(
          collection(db, "feedback"),
          where("organizerId", "==", user.uid), 
          orderBy("createdAt", "desc")
        );

        const unsubscribeSnap = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setReviews(data);
          setLoading(false);
        }, (error) => {
          console.error("Firestore Error:", error);
          setLoading(false);
        });

        return () => unsubscribeSnap();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Calculate stats: Average and Bar Percentages
  const stats = useMemo(() => {
    if (reviews.length === 0) return { avg: "0.0", total: 0, counts: [0, 0, 0, 0, 0] };
    const total = reviews.length;
    const counts = [0, 0, 0, 0, 0]; 
    let sum = 0;

    reviews.forEach((r) => {
      const val = Number(r.stars) || 0; 
      if (val >= 1 && val <= 5) {
        counts[val - 1]++;
        sum += val;
      }
    });

    return {
      avg: (sum / total).toFixed(1),
      total,
      counts: [...counts].reverse(), // Reversed to show 5 stars at the top
    };
  }, [reviews]);

  if (loading) return (
    <div className="loading-container">
      <div className="loader"></div>
      <p>Syncing Student Feedback...</p>
    </div>
  );

  return (
    <>
<Sidebar 
  isOpen={sidebarOpen} 
  onClose={() => setSidebarOpen(false)}
/>
<Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

      <div className="page-content feedback-page">
        <div className="feedback-header-section">
          <h2 className="title-main">Student Feedback & Ratings</h2>
          <p className="subtitle-text">Monitor reviews submitted by students for your approved events.</p>
        </div>
        
        {/* Rating Summary Card */}
        <div className="rating-summary card">
          <div className="rating-left">
            <h1 className="rating-number">{stats.avg}</h1>
            <div className="rating-stars">
              {"★".repeat(Math.floor(Number(stats.avg)))}{"☆".repeat(5 - Math.floor(Number(stats.avg)))}
            </div>
            <p className="rating-total">Based on {stats.total} total reviews</p>
          </div>

          <div className="rating-bars">
            {stats.counts.map((count, index) => {
              const starLevel = 5 - index;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div className="bar-row" key={starLevel}>
                  <div className="star-label"><span>{starLevel} ★</span></div>
                  <div className="bar-container">
                    <div className="fill" style={{ width: `${percentage}%` }}></div>
                  </div>
                  <div className="count-label"><span>{count}</span></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback List */}
        <h3 className="feedback-title">Recent Student Reviews</h3>
        <div className="feedback-list">
          {reviews.length === 0 ? (
            <div className="empty-state card">
               <p>No feedback received yet. Students can only review your <b>approved</b> events.</p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div className="feedback-card card" key={rev.id}>
                <div className="feedback-avatar">
                  <div className="avatar-alt">
                    {rev.name ? rev.name.charAt(0).toUpperCase() : "S"}
                  </div>
                </div>
                <div className="feedback-content">
                  <div className="feedback-header">
                    <h4>{rev.name || "Anonymous Student"}</h4>
                    <span className="event-tag">{rev.event}</span>
                  </div>
                  <div className="stars">
                    {"⭐".repeat(rev.stars)}
                  </div>
                  <p className="review-text">{rev.text}</p>
                  <span className="review-date">
                    {rev.createdAt?.toDate().toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}