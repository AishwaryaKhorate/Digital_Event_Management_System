import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage, functions } from "../firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import "./CreateEvent_o.css";
import { useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// CHANGE THIS (around line 14):
function todayISODate() {
  const d = new Date();
  // Using 'en-CA' is a trick to get YYYY-MM-DD format easily
  return d.toLocaleDateString('en-CA');
}
export default function CreateEvent() {
  const navigate = useNavigate();
  
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    date: todayISODate(),
    time: "",
    venue: "",
    category: "",
    paymentType: "free",
    soloPrice: "",
    duetPrice: "",
    groupPrice: "",
    minGroupMembers: "",
    maxGroupMembers: "",
    rules: "",
    posterURL: "",
    maxSeats: "", 
  });

  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);
  const certInputRef = useRef(null); 
  const timeInputRef = useRef(null);
 
  const location = useLocation();
const editId = new URLSearchParams(location.search).get("edit");
const isEditMode = Boolean(editId);

const validators = {
  name: (v) => v.trim() ? "" : "Event name is required",
  category: (v) => v ? "" : "Please select a category",
  venue: (v) => v.trim() ? "" : "Venue is required",
  date: (v) => v ? "" : "Select a valid date",
  time: (v) => v ? "" : "Select event time",
  description: (v) => v.trim() ? "" : "Description is required",
  posterURL: (v, isEditMode, posterFile) =>
    !isEditMode && !posterFile && !v ? "Poster is required" : "",
};
const fieldRefs = {
  name: useRef(null),
  category: useRef(null),
  venue: useRef(null),
  date: useRef(null),
  time: useRef(null),
  description: useRef(null),
  posterURL: useRef(null),
  maxSeats: useRef(null),

  // paid event fields
  soloPrice: useRef(null),
  duetPrice: useRef(null),
  groupPrice: useRef(null),
  minGroupMembers: useRef(null),
  maxGroupMembers: useRef(null),

  paymentType: useRef(null), // optional scroll target for payment errors
};

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login"); 
      setInitializing(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (posterPreview && !posterPreview.startsWith('http')) URL.revokeObjectURL(posterPreview);
    };
  }, [posterPreview]);

  // Generic Upload Logic
  const uploadToFirebase = async (file, pathPrefix) => {
    if (!file) return null;
    const storageRef = ref(storage, `${pathPrefix}/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        }, 
        (error) => reject(error), 
        () => getDownloadURL(uploadTask.snapshot.ref).then(resolve)
      );
    });
  };

  function onChange(e) {
  const { name, value } = e.target;

  setForm((prev) => ({ ...prev, [name]: value }));

  // live validation
  setErrors((prev) => ({
    ...prev,
    [name]: validators[name]
      ? validators[name](value, isEditMode, posterFile)
      : "",
  }));
}


  // Prevents user from typing '-' or 'e' in number inputs
  const blockInvalidChars = (e) => {
    if (["e", "E", "-", "+"].includes(e.key)) {
      e.preventDefault();
    }
  };

  function handleUrlInput(e, type) {
    const url = e.target.value;
    if (type === 'poster') {
      setForm(prev => ({ ...prev, posterURL: url }));
      setPosterPreview(url);
      setPosterFile(null);
    } else {
      setForm(prev => ({ ...prev, certificateURL: url }));
      setCertPreview(url);
      setCertFile(null);
    }
  }

  function handleFile(file, type) {
    if (!file || !file.type.startsWith("image/")) return;
    if (type === 'poster') {
      setPosterFile(file);
      setForm(prev => ({ ...prev, posterURL: "" }));
      setPosterPreview(URL.createObjectURL(file));
    } else {
      setCertFile(file);
      setForm(prev => ({ ...prev, certificateURL: "" }));
      setCertPreview(URL.createObjectURL(file));
    }
  }

  function removeMedia(e, type) {
    e.stopPropagation();
    if (type === 'poster') {
      setPosterFile(null);
      setPosterPreview("");
      setForm(prev => ({ ...prev, posterURL: "" }));
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setCertFile(null);
      setCertPreview("");
      setForm(prev => ({ ...prev, certificateURL: "" }));
      if (certInputRef.current) certInputRef.current.value = "";
    }
  }

 function validateAll() {
  const newErrors = {};

  // run all simple validators
  Object.keys(validators).forEach((key) => {
    const err = validators[key](form[key], isEditMode, posterFile);
    if (err) newErrors[key] = err;
  });

  // --- extra validation ---

  // poster validation (when creating)
  if (!isEditMode && !posterFile && !form.posterURL) {
    newErrors.posterURL = "Poster is required";
  }

  // seat capacity validation
  if (form.maxSeats !== "" && Number(form.maxSeats) <= 0) {
    newErrors.maxSeats = "Max seats must be a positive number";
  }

  // paid event rules
  if (form.paymentType === "paid") {
    if (!form.soloPrice && !form.duetPrice && !form.groupPrice) {
      newErrors.paymentType = "Add at least one fee";
    }

    // Add this logic to handle the empty strings:
  const min = parseInt(form.minGroupMembers);
  const max = parseInt(form.maxGroupMembers);

  if (form.groupPrice) {
    if (!form.minGroupMembers) newErrors.minGroupMembers = "Required for group";
    if (!form.maxGroupMembers) newErrors.maxGroupMembers = "Required for group";
    
    if (min && max && min > max) {
      newErrors.minGroupMembers = "Min size cannot exceed max size";
    }
  }


    if (form.minGroupMembers > form.maxGroupMembers) {
      newErrors.minGroupMembers = "Min size cannot exceed max size";
    }
  }

  setErrors(newErrors);
  return newErrors;  // return full object for scroll logic
}


async function handleSubmit(e) {
  e.preventDefault();

  // Run full validation
  const validationErrors = validateAll();

  // If any errors exist → scroll + stop submit
if (Object.keys(validationErrors).length > 0) {
  const firstErrorKey = Object.keys(validationErrors)[0];
  const targetRef = fieldRefs[firstErrorKey];

  if (targetRef?.current) {
    targetRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    targetRef.current.focus?.();
  }

  return; 
}


  // --- If validation passed ---
  setSubmitting(true);

  try {
    let finalPosterURL = form.posterURL;

    // Upload new poster only if user selected new one
    if (posterFile) {
      finalPosterURL = await uploadToFirebase(posterFile, "posters");
    }

    if (isEditMode) {
      // -------- UPDATE EVENT --------
      const updateEvent = httpsCallable(functions, "updateEventSecure");
      await updateEvent({
        eventId: editId,
        ...form,
        posterURL: finalPosterURL,
      });

      alert("Event updated successfully!");
      navigate("/event-status_o");
    } else {
      // -------- CREATE EVENT --------
      const submitEvent = httpsCallable(functions, "submitEventSecure");
      await submitEvent({
        ...form,
        posterURL: finalPosterURL,
        organizerId: auth.currentUser.uid,
        organizerEmail: auth.currentUser.email,
        organizerName:
          auth.currentUser.displayName || "Authorized Organizer",
        status: "pending",
        currentRegistrations: 0,
        createdAt: new Date().toISOString(),
      });

      alert("Success! Event submitted for admin approval.");
      navigate("/event-status_o");
    }
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    setSubmitting(false);
    setUploadProgress(0);
  }
}

  useEffect(() => {
  if (!isEditMode) return;

  const fetchEvent = async () => {
    const snap = await getDoc(doc(db, "events", editId));
    if (snap.exists()) {
      const data = snap.data();

      setForm(prev => ({
        ...prev,
        ...data
      }));

      if (data.posterURL) {
        setPosterPreview(data.posterURL);
      }
    }
  };

  fetchEvent();
}, [isEditMode, editId]);

  if (initializing) return <div className="loading-screen">Preparing Form...</div>;

  return (
    <>
<Sidebar 
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
<Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

      <div className="page-content create-event-page">
        <h2 className="title-main">Event Management</h2>

<form className="card event-form-container" onSubmit={handleSubmit}>
  <fieldset disabled={submitting} className="form-lock">

          <h3 className="form-title">Create New Event</h3>
          <p className="form-subtitle">Fill in details and set registration fees</p>

          <div className="form-grid">
            <div className="form-group full">
              <label>Event Name *</label>
              <input ref={fieldRefs.name} name="name" value={form.name} onChange={onChange} placeholder="Enter event name" />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select ref={fieldRefs.category} name="category" value={form.category} onChange={onChange}>
                <option value="">Select Category</option>
                <option value="technical">Technical</option>
                <option value="cultural">Cultural</option>
                <option value="sports">Sports</option>
                <option value="workshop">Workshop</option>
                <option value="seminar">Seminar</option>
                <option value="academic">Academic</option>
                <option value="social">Social</option>
                <option value="others">Others</option>
              </select>
            </div>

            <div className="form-group">
              <label>Venue *</label>
              <input ref={fieldRefs.venue} name="venue" value={form.venue} onChange={onChange} placeholder="Location/Hall" />
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input ref={fieldRefs.date} type="date" name="date" min={todayISODate()} value={form.date} onChange={onChange} />
            </div>

            <div className="form-group">
              <label>Time *</label>
              <input ref={fieldRefs.time} type="time" name="time" value={form.time} onChange={onChange} />
            </div>

            <div className="form-group full">
              <label>Total Seat Capacity (Optional)</label>
              <input 
              ref={fieldRefs.maxSeats} 
                type="number" 
                name="maxSeats" 
                min="0" 
                onKeyDown={blockInvalidChars} 
                value={form.maxSeats} 
                onChange={onChange} 
                placeholder="Leave blank for unlimited" 
              />
            </div>

            <div className="form-group full">
              <label>Entry Fee Type</label>
              <div className="payment-toggle-bar">
                <button type="button" className={form.paymentType === "free" ? "active" : ""} onClick={() => setForm(f => ({...f, paymentType: 'free'}))}>Free Registration</button>
                <button type="button" className={form.paymentType === "paid" ? "active" : ""} onClick={() => setForm(f => ({...f, paymentType: 'paid'}))}>Paid Registration</button>
              </div>
            </div>

            {form.paymentType === "paid" && (
              <div className="form-group full fee-structure-box">
                <p className="small-heading">Define All Entry Fees (₹)</p>
                <div className="fee-row">
                  <div className="fee-input-unit">
                    <label>Solo Fee</label>
                    <input ref={fieldRefs.soloPrice} type="number" name="soloPrice" min="0" onKeyDown={blockInvalidChars} value={form.soloPrice} onChange={onChange} placeholder="0" />
                  </div>
                  <div className="fee-input-unit">
                    <label>Duet Fee</label>
                    <input ref={fieldRefs.duetPrice} type="number" name="duetPrice" min="0" onKeyDown={blockInvalidChars} value={form.duetPrice} onChange={onChange} placeholder="0" />
                  </div>
                  <div className="fee-input-unit">
                    <label>Group Fee</label>
                    <input ref={fieldRefs.groupPrice} type="number" name="groupPrice" min="0" onKeyDown={blockInvalidChars} value={form.groupPrice} onChange={onChange} placeholder="0" />
                  </div>
                </div>
                <div className="group-settings-row">
                  <div className="fee-input-unit">
                    <label>Min Group Size</label>
                    <input ref={fieldRefs.minGroupMembers} type="number" name="minGroupMembers" min="1" onKeyDown={blockInvalidChars} value={form.minGroupMembers} onChange={onChange} />
                  </div>
                  <div className="fee-input-unit">
                    <label>Max Group Size</label>
                    <input ref={fieldRefs.maxGroupMembers} type="number" name="maxGroupMembers" min="1" onKeyDown={blockInvalidChars} value={form.maxGroupMembers} onChange={onChange} />
                  </div>
                </div>
              </div>
            )}

            <div className="form-group full">
              <label>Event Poster (URL or Upload)</label>
              <input ref={fieldRefs.posterURL} type="text" placeholder="Paste Google Image URL here..." value={form.posterURL} onChange={(e) => handleUrlInput(e, 'poster')} style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }} />
              <div className={`upload-box ${posterPreview ? "has-image" : ""}`} onClick={() => !posterPreview && fileInputRef.current.click()}>
                {posterPreview ? (
                  <div className="poster-preview-container">
                    <img src={posterPreview} alt="poster" className="poster-img" />
                    <button type="button" className="remove-poster-btn" onClick={(e) => removeMedia(e, 'poster')}>remove</button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-icon">⬆</div>
                    <p>Click to upload poster image</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={(e) => handleFile(e.target.files[0], 'poster')} />
              </div>
            </div>


            <div className="form-group full">
              <label>Rules & Description</label>
              <textarea ref={fieldRefs.description} name="description" value={form.description} onChange={onChange} rows="4" placeholder="Mention rules..." />
            </div>
          </div>

          <div className="submit-row">
            <button className="submit-btn" disabled={submitting}>
              {submitting 
  ? (isEditMode ? "Updating..." : "Processing...")
  : (isEditMode ? "Update Event" : "Create Event")
}

            </button>
          </div>
  </fieldset>
</form>
      </div>
    </>
  );
}