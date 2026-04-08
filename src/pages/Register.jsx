import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/navbar";
import { db, auth, functions } from "../firebase";
import { doc, getDoc, collection, serverTimestamp, runTransaction } from "firebase/firestore";
import "./register.css";
import { httpsCallable } from "firebase/functions";
import QRCode from 'qrcode';

export default function Register() {
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [groupSize, setGroupSize] = useState(1);
  const [studentsData, setStudentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // --- FETCH EVENT DETAILS ---
  const resetStudents = (count) => {
    setGroupSize(count);
    setStudentsData(Array.from({ length: count }, () => ({
      name: "", college: "", email: ""
    })));
  };

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(location.search);
        const eventId = params.get("eventId");
        if (eventId) {
          const docSnap = await getDoc(doc(db, "events", eventId));
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() };
            setEvent(data);
            if (!data.soloPrice && !data.duetPrice && !data.groupPrice) {
              resetStudents(1);
            } else {
              const initialMode = data.soloPrice ? 1 : (data.duetPrice ? 2 : (Number(data.minGroupMembers) || 3));
              resetStudents(initialMode);
            }
          }
        }
      } catch (err) {
        console.error(err);
        window.alert("❌ Error: Failed to load event details.");
      } finally { setLoading(false); }
    };
    fetchEvent();
  }, [location.search]);

  // --- SEAT LOGIC ---
  const maxSeats = useMemo(() => parseInt(event?.maxSeats) || 0, [event]);
  const currentRegs = useMemo(() => event?.currentRegistrations || 0, [event]);
  const isSeatsFull = useMemo(() => maxSeats > 0 && currentRegs >= maxSeats, [maxSeats, currentRegs]);
  const availableSeats = useMemo(() => maxSeats > 0 ? (maxSeats - currentRegs) : "Unlimited", [maxSeats, currentRegs]);

  const addMember = () => {
    const maxLimit = Number(event?.maxGroupMembers) || 5;
    if (studentsData.length < maxLimit) {
      setStudentsData([...studentsData, { name: "", college: "", email: "" }]);
      setGroupSize(prev => prev + 1);
    } else {
      window.alert(`⚠️ Maximum limit of ${maxLimit} members reached.`);
    }
  };

  const removeMember = (index) => {
    const minLimit = Number(event?.minGroupMembers) || 3;
    if (studentsData.length > minLimit) {
      const updated = studentsData.filter((_, i) => i !== index);
      setStudentsData(updated);
      setGroupSize(updated.length);
    }
  };

  // Everithing fixed
// Form validation done

const handleInputChange = (index, field, value) => {
  const newData = [...studentsData];

  // ===== NAME FIELD =====
  if (field === "name") {
    value = value.replace(/[^a-zA-Z\s.'-]/g, "");
    value = value.replace(/^[.'-\s]+/, "");
    value = value.replace(/([.'-]){2,}/g, "$1");
  }

  // ===== COLLEGE FIELD =====
  if (field === "college") {
    // Allow only letters, numbers & spaces
    value = value.replace(/[^a-zA-Z0-9\s-]/g, "");

    // Prevent starting with special characters
    value = value.replace(/^[\s-]+/, "");

    // Prevent multiple spaces
    value = value.replace(/\s{2,}/g, " ");
  }

  // ===== EMAIL FIELD =====
  if (field === "email") {
    value = value.toLowerCase();
    value = value.replace(/\s/g, "");
    value = value.replace(/^\.+/, "");
    value = value.replace(/\.{2,}/g, ".");
  }

  newData[index][field] = value;
  setStudentsData(newData);
};

  const totalAmount = useMemo(() => {
    if (!event) return 0;
    if (groupSize === 1) return Number(event.soloPrice || 0);
    if (groupSize === 2) return Number(event.duetPrice || 0);
    return Number(event.groupPrice || 0);
  }, [event, groupSize]);

  const registrationDate = new Date();
  const registrationDateText = registrationDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const registrationTimeText = registrationDate.toLocaleTimeString("en-IN");


// Helper function to handle the actual DB saving and navigation
// This avoids code duplication between Free and Paid flows
const finalizeRegistration = async (regId, qrUrl, customData = null) => {
  const sendQR = httpsCallable(functions, "sendRegistrationQR");
  await sendQR({
    registrationId: regId,
    submittedByEmail: studentsData[0].email,
    eventName: event.name,
    qrImageBase64: qrUrl,
    participantNames: studentsData.map((p) => p.name),
    registeredDate: registrationDateText,
    registeredTime: registrationTimeText,
  });

  navigate("/registration-success", {
    state: {
      qrData: {
        registrationId: regId,
        studentName: studentsData[0].name,
        email: studentsData[0].email,
        college: studentsData[0].college,
        eventName: event.name,
        eventId: event.id,
        participants: studentsData,
        registeredDate: registrationDateText,
        registeredTime: registrationTimeText,
        ...(customData || {})
      },
    },
  });
};

const handleSubmit = async () => {
  if (isSeatsFull) {
    window.alert("⚠️ Sorry, seats are already full for this event.");
    return;
  }

  // Basic Validation
const gmailRegex = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@gmail\.com$/;
  const isFormValid = studentsData.every(
    (s) => s.name.trim() !== "" && s.college.trim() !== "" && s.email.trim() !== ""
  );

  if (!isFormValid) {
    window.alert("⚠️ Please fill in all participant details.");
    return;
  }

  if (!studentsData.every((s) => gmailRegex.test(s.email.trim()))) {
  window.alert("⚠️ Enter a valid @gmail.com address.");
  return;
}

const nameRegex = /^[A-Za-z]+([ .'-][A-Za-z]+)*$/;

if (!studentsData.every((s) => nameRegex.test(s.name.trim()))) {
  window.alert("⚠️ Name should contain only letters.");
  return;
}

const collegeRegex = /^[A-Za-z0-9]+([ -][A-Za-z0-9]+)*$/;

if (!studentsData.every((s) => collegeRegex.test(s.college.trim()))) {
  window.alert("⚠️ Enter a valid college name.");
  return;
}
  setIsSubmitting(true);

  try {
    // --- CASE 1: PAID EVENT ---
    if (totalAmount > 0) {
      if (!auth.currentUser) {
        window.alert("⚠️ Please login first to register for paid events.");
        setIsSubmitting(false);
        return;
      }

      const createOrder = httpsCallable(functions, "createRazorpayOrder");
      const verifyPayment = httpsCallable(functions, "verifyRazorpayPayment");

      const orderRes = await createOrder({ amount: totalAmount });
      const { orderId } = orderRes.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        name: "Event Registration",
        description: event.name,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              registrationData: {
                userId: auth.currentUser.uid,
                eventId: event.id,
                eventName: event.name,
                // Pass date and time to save in DB
                date: event.date,
                time: event.time,
                participants: studentsData.map(p => ({
                   ...p,
                   attendanceStatus: "Absent",
                   certificateGenerated: false
                })),
                amount: totalAmount,
                submittedByEmail: studentsData[0].email,
              }
            });

            if (verifyRes.data.success) {
              const finalRegId = verifyRes.data.registrationId;
              const finalQrUrl = await QRCode.toDataURL(finalRegId);
              // QR only sends after DB confirms payment is valid
              await finalizeRegistration(finalRegId, finalQrUrl, { 
                paymentId: response.razorpay_payment_id 
              });
            }
          } catch (err) {
            console.error(err);
            alert("Payment verification failed. Please contact support if money was deducted.");
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: studentsData[0].name,
          email: studentsData[0].email,
        },
        modal: { 
          ondismiss: () => setIsSubmitting(false) 
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      return; // Stops execution here for paid events
    }

    // --- CASE 2: FREE EVENT ---
    const registrationId = `REG-${Date.now()}`;
    const registrationData = {
      registrationId,
      userId: auth.currentUser?.uid || null,
      eventId: event.id,
      eventName: event.name,
      date: event.date,
      time: event.time,
      participants: studentsData.map((p) => ({
        ...p,
        attendanceStatus: "Absent",
        certificateGenerated: false
      })),
      amount: 0,
      status: "Confirmed",
      timestamp: serverTimestamp(),
      submittedByEmail: studentsData[0].email,
    };

    await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, "events", event.id);
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) throw new Error("Event does not exist!");
      
      const latestRegCount = eventDoc.data().currentRegistrations || 0;
      const max = parseInt(eventDoc.data().maxSeats) || 0;
      
      if (max > 0 && latestRegCount >= max) {
        throw new Error("Seats filled up just now!");
      }

      transaction.update(eventRef, { currentRegistrations: latestRegCount + 1 });
      transaction.set(doc(db, "registrations", registrationId), registrationData);
    });

    const freeQrUrl = await QRCode.toDataURL(registrationId);
    await finalizeRegistration(registrationId, freeQrUrl);

  } catch (error) {
    console.error("Error:", error);
    window.alert(`❌ ${error.message}`);
    setIsSubmitting(false);
  }
};
  
  if (loading) return <div className="app-shell"><Sidebar /><div className="content-area"><Navbar /><div className="loader-blue">Syncing...</div></div></div>;

  return (
    <div className="app-shell">
       <Sidebar 
               isOpen={isSidebarOpen} 
               onClose={() => setIsSidebarOpen(false)} 
             />
           
             
      <div className="content-area">
<Navbar onMenuClick={() => setIsSidebarOpen(true)} />

             
                <main 
  className="reg-wrapper" 
  style={{ 
    pointerEvents: isSubmitting ? "none" : "auto", 
    opacity: isSubmitting ? 0.7 : 1 
  }}
>
          <div className="clean-white-card">
            <div className="reg-header-minimal">
              <div className="header-text">
                <h1>{event?.name}</h1>
                <p className="blue-tag">{event?.category}</p>
                {/* Seat Display */}
                <div className="seat-indicator">
                   Seats: <span className={isSeatsFull ? "red-text" : "green-text"}>{availableSeats}</span> Available
                </div>
              </div>
              <div className="header-details">
                <span className="pill-blue-light">📍 {event?.venue}</span>
                <span className="pill-blue-light">📅 {event?.date} | ⏰ {event?.time}</span>
              </div>
            </div>

            {isSeatsFull ? (
              <div className="full-warning-box">
                <h2>⚠️ Registration Closed</h2>
                <p>Sorry, you cannot register for this event, seats are already full.</p>
                <button onClick={() => navigate(-1)} className="back-btn">Go Back</button>
              </div>
            ) : (
              <>
                {totalAmount > 0 && (
                  <div className="form-section-minimal">
                    <label className="blue-label">Participation Mode</label>
                    <div className="mode-pills">
                      {event?.soloPrice && <button className={groupSize === 1 ? "active" : ""} onClick={() => resetStudents(1)}>Solo • ₹{event.soloPrice}</button>}
                      {event?.duetPrice && <button className={groupSize === 2 ? "active" : ""} onClick={() => resetStudents(2)}>Duet • ₹{event.duetPrice}</button>}
                      {event?.groupPrice && <button className={groupSize >= (event?.minGroupMembers || 3) ? "active" : ""} onClick={() => resetStudents(Number(event?.minGroupMembers) || 3)}>Group • ₹{event.groupPrice}</button>}
                    </div>
                  </div>
                )}

                <div className="form-section-minimal">
                  <div className="section-title-flex">
                    <label className="blue-label">{totalAmount === 0 ? "Registration Form" : "Participant Details"}</label>
                    {totalAmount > 0 && groupSize >= (event?.minGroupMembers || 3) && (
                      <button className="add-member-blue" onClick={addMember}>
                        + Add Member ({studentsData.length}/{event?.maxGroupMembers})
                      </button>
                    )}
                  </div>
                  <div className="participants-stack">
                    {studentsData.map((s, i) => (
                      <div key={i} className="student-card-white">
                        <div className="card-header-blue">
                          <span>{i === 0 ? (totalAmount === 0 ? "STUDENT INFO" : "TEAM LEADER") : `PARTICIPANT ${i + 1}`}</span>
                          {totalAmount > 0 && i >= (event?.minGroupMembers || 3) && (
                            <button className="remove-red" onClick={() => removeMember(i)}>Remove</button>
                          )}
                        </div>
                        <div className="input-grid-blue">
  <input 
    placeholder="Full Name" 
    value={s.name} 
    onChange={(e) => handleInputChange(i, 'name', e.target.value)} 
    required 
    readOnly={isSubmitting} // <--- ADD THIS
  />
  <input 
    placeholder="College" 
    value={s.college} 
    onChange={(e) => handleInputChange(i, 'college', e.target.value)} 
    required 
    readOnly={isSubmitting} // <--- ADD THIS
  />
  <input 
    placeholder="Email Address" 
    type="email" 
    className="full-span" 
    value={s.email} 
    onChange={(e) => handleInputChange(i, 'email', e.target.value)} 
    required 
    readOnly={isSubmitting} // <--- ADD THIS
  />
</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="reg-footer-blue">
                  <div className="summary-left">
                    <small>Final Amount</small>
                    <h2 className="blue-amount">{totalAmount === 0 ? "FREE" : `₹${totalAmount}`}</h2>
                  </div>
                 <button 
  className="razorpay-btn-main" 
  onClick={handleSubmit} 
  disabled={isSubmitting}
  style={{
    cursor: isSubmitting ? "not-allowed" : "pointer",
    filter: isSubmitting ? "grayscale(1)" : "none"
  }}
>
  {isSubmitting
    ? (totalAmount === 0 ? "Processing..." : "Processing Payment...")
    : (totalAmount === 0 ? "Confirm Registration" : "Pay & Register Now")
  }
</button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

