import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/navbar";
import "./feedback.css";

import { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    query,      // ⭐️ Import query
    where,      // ⭐️ Import where
    serverTimestamp,
    auth, 
    onAuthStateChanged ,
    updateDoc, // 👈 Add this
    doc
} from "../firebase"; 

export default function Feedback() {
  const [rating, setRating] = useState(0);         
  const [hover, setHover] = useState(0);           
  const [comment, setComment] = useState("");      
  const [selectedEvent, setSelectedEvent] = useState(null); 
  const [eventsList, setEventsList] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState(''); 

  const [userInfo, setUserInfo] = useState({ uid: null, email: null, name: "Student" });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserInfo({ 
          uid: user.uid, 
          email: user.email,
          name: user.displayName || user.email.split('@')[0]
        });
      }
    });

    // ⭐️ Updated Fetch Logic to get ONLY approved events
    const fetchEvents = async () => {
        try {
            const q = query(collection(db, "events"), where("status", "==", "approved"));
            const querySnapshot = await getDocs(q);
            
            const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD

            const completedEvs = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(ev => ev.date < today); // ⭐ Filters events whose date is before today

            setEventsList(completedEvs);
        } catch (err) {
            console.error("Error fetching events:", err);
        }
    };
    fetchEvents();
    return () => unsubscribeAuth();
  }, []);

  const handleSubmit = async () => {
    if (!userInfo.uid) {
        setSubmissionMessage("Please log in first.");
        return;
    }

    if (!rating || comment.trim() === "" || !selectedEvent) {
      setSubmissionMessage("Please provide a rating, comment, and select an event.");
      return;
    }
    
    setLoading(true);
    setSubmissionMessage('');

    try {
        // 1. Save feedback for Organizer
        const feedbackData = {
            stars: rating, 
            text: comment.trim(), 
            name: userInfo.name, 
            event: selectedEvent.name, 
            eventId: selectedEvent.id, 
            organizerId: selectedEvent.organizerId, 
            userId: userInfo.uid,
            userEmail: userInfo.email,
            createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, "feedback"), feedbackData);

        // 2. Save for Student Recent Activity
        const activityData = {
            icon: 'Star', 
            text: `You gave <b>${rating} stars</b> to <b>"${selectedEvent.name}"</b>`,
            timestamp: serverTimestamp(),
            type: 'feedback'
        };
        await addDoc(collection(db, "users", userInfo.uid, "activities"), activityData);

        // ⭐️ 3. NEW: UPDATE AVERAGE RATING ⭐️
        // Fetch all feedback this student has ever given
        const q = query(collection(db, "feedback"), where("userId", "==", userInfo.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const allRatings = querySnapshot.docs.map(d => d.data().stars || 0);
            const total = allRatings.reduce((acc, curr) => acc + curr, 0);
            const average = (total / allRatings.length).toFixed(1); // Calculate average

            // Update the 'users' document for the student
            const userRef = doc(db, "users", userInfo.uid);
            await updateDoc(userRef, {
                averageRating: parseFloat(average)
            });
        }

        setSubmissionMessage("Thank you! Feedback submitted successfully.");
        setRating(0); 
        setComment(""); 
        setSelectedEvent(null);
        setHover(0); 
        
    } catch (error) {
        console.error("Error:", error);
        setSubmissionMessage("Submission failed. Try again.");
    } finally {
        setLoading(false);
    }
};
  return (
    <>
     <Sidebar 
         isOpen={isSidebarOpen} 
         onClose={() => setIsSidebarOpen(false)} 
       />
     
       <Navbar onMenuClick={() => setIsSidebarOpen(true)} />


      <div className="feedback-page">
        <h1 className="feedback-title">Provide Feedback</h1>

        <div className="feedback-box">
            <label className="label-title">Select the event you attended:</label>
            <select 
                className="event-input" 
                onChange={(e) => {
                    const ev = eventsList.find(item => item.id === e.target.value);
                    setSelectedEvent(ev);
                }}
                value={selectedEvent?.id || ""}
            >
                <option value="" disabled>-- Select an Event --</option>
                {eventsList.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
            </select>

          <label className="label-title" style={{marginTop: '20px'}}>Rate your experience:</label>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={(hover || rating) >= star ? "star active" : "star"}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                ★
              </span>
            ))}
          </div>

          <label className="label-title">Your comments:</label>
          <textarea
            className="feedback-input"
            placeholder="What did you like or what can be improved?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
          ></textarea>
          
          {submissionMessage && (
            <div className={`submission-message ${submissionMessage.includes("successfully") ? 'success' : 'error'}`}>
                {submissionMessage}
            </div>
          )}

          <button 
                className="submit-btn" 
                onClick={handleSubmit} 
                disabled={loading || !userInfo.uid}
            >
            {loading ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </div>
    </>
  );
}