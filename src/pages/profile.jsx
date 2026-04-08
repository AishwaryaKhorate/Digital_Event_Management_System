import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar"; 
import Navbar from "../components/navbar"; 
import "./profile.css"; 

import { 
    db, doc, setDoc, getDoc, auth, onAuthStateChanged, signOut, serverTimestamp,
    storage // 💡 Import storage from your firebase.js
} from "../firebase"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // 💡 Import storage methods

export default function Profile() {
  const [userId, setUserId] = useState(null); 
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "", 
    photo: ""
  });
      const [phoneError, setPhoneError] = useState(""); // Add this line
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 💡 Function to update Navbar icon instantly
  const broadcastImage = (url) => {
    window.dispatchEvent(new CustomEvent("profileImageUpdated", { detail: url }));
  };

  const fetchProfileData = useCallback(async (currentUserId) => { 
      if (!currentUserId) return;
      setLoading(true);
      try {
          const docRef = doc(db, "student_profile", currentUserId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
              const data = docSnap.data();
              setProfile({
                  name: data.name || "",
                  email: data.email || "",
                  phone: data.phone || "", 
                  photo: data.photo || "",
              });
              // Sync image to Navbar if it exists in database
              if (data.photo) broadcastImage(data.photo);
          }
      } catch (err) {
          setFetchError("Failed to load profile data.");
      } finally {
          setLoading(false);
      }
  }, []); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            setUserId(user.uid);
            fetchProfileData(user.uid); 
        } else {
            setLoading(false);
        }
    });
    return () => unsubscribe();
  }, [fetchProfileData]); 

  const handleChange = (e) => {
    setProfile({...profile, [e.target.name]: e.target.value});
  };

  // 💡 UPDATED: Permanent Storage Upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if(!file || !userId) return;

    setIsSaving(true);
    try {
      const storageRef = ref(storage, `profile_images/${userId}`);
      // Upload file
      await uploadBytes(storageRef, file);
      // Get permanent URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setProfile(prev => ({...prev, photo: downloadURL}));
      broadcastImage(downloadURL); // Update Navbar

      // Save URL to Firestore so it stays after refresh
      await setDoc(doc(db, "student_profile", userId), { photo: downloadURL }, { merge: true });
      alert("Profile picture updated! ✅");
    } catch (err) {
      alert("Upload failed. Check your Firebase Storage rules.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setProfile({...profile, photo: ""});
    broadcastImage(null);
    if (userId) {
      await setDoc(doc(db, "student_profile", userId), { photo: "" }, { merge: true });
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    try {
        const userDocRef = doc(db, "student_profile", userId);
        await setDoc(userDocRef, {
            name: profile.name,
            phone: profile.phone,
            photo: profile.photo,
            lastUpdated: serverTimestamp(), 
        }, { merge: true }); 
        alert("Profile Saved Successfully! ✅");
    } catch (error) {
        alert("Failed to save profile.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    broadcastImage(null);
    navigate("/signup");
  };

  if (loading) return <div className="profile-page" style={{textAlign:'center', paddingTop:'100px'}}><h2>Loading Profile...</h2></div>;
const handlePhoneChange = (e) => {
    const value = e.target.value;
    
    // 1. Check if the user typed a letter or symbol
    const containsNonDigits = /[^\d]/.test(value);
    
    // 2. Clean the input to keep only numbers
    const cleaned = value.replace(/\D/g, ""); 
    
    // 3. Update the profile state with ONLY numbers
    setProfile({ ...profile, phone: cleaned });

    // 4. Set the error message priority
    if (containsNonDigits) {
      setPhoneError("Invalid input: Only numbers are allowed");
    } else if (cleaned.length > 0 && cleaned.length < 10) {
      setPhoneError("Phone number must be at least 10 digits");
    } else {
      setPhoneError("");
    }
  };
  return (
    <>
     <Sidebar 
         isOpen={isSidebarOpen} 
         onClose={() => setIsSidebarOpen(false)} 
       />
     
      <Navbar onMenuClick={() => setIsSidebarOpen(true)} />

      <div className="profile-page">
        <h1 className="profile-title">My Profile</h1>
        <div className="profile-container">
          <div className="photo-box">
            <div className="avatar-circle">
              {profile.photo 
                ? <img src={profile.photo} alt="Profile" />
                : profile.name.charAt(0).toUpperCase() || "U"} 
            </div>
            <label className="upload-btn">
              Upload New Photo
              <input type="file" hidden onChange={handleUpload} disabled={isSaving} />
            </label>
            <button className="remove-btn" onClick={handleRemove} disabled={isSaving}>Remove Photo</button>
          </div>

          <div className="form-box">
            <label>Name</label>
            <input type="text" name="name" value={profile.name} onChange={handleChange} disabled={isSaving} />
            <label>Email</label>
            <input type="email" value={profile.email} disabled={true} />
           <label>Phone</label>
<div style={{ position: "relative", marginBottom: "25px" }}> 
  <input 
    type="text" 
    name="phone" 
    value={profile.phone} 
    onChange={handlePhoneChange} 
    disabled={isSaving} 
    placeholder="Enter 10-digit phone No." 
    maxLength="10" 
    style={{ 
      borderColor: phoneError ? "#ef4444" : "#ccc",
      marginBottom: "0px" // We use absolute position below instead
    }} 
  />

  {phoneError && (
    <p style={{ 
      color: "#ef4444", 
      fontSize: "11px", 
      position: "absolute",
      bottom: "-18px", // Places it exactly in the margin space
      left: "0",
      margin: "0",
      padding: "0"
    }}>
      {phoneError}
    </p>
  )}
</div>
            <button 
  className="save-profile-btn" 
  onClick={handleSave} 
  disabled={isSaving || phoneError !== "" || profile.phone.length < 10}
  style={{
    cursor: (phoneError || isSaving) ? "not-allowed" : "pointer",
    opacity: (phoneError || isSaving) ? 0.7 : 1
  }}
>
  {isSaving ? "Saving..." : "Save Profile Details"}
</button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </>
  );
}