import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar_o";
import Navbar from "../components/Navbar_o";
import "./OrganizerProfile_o.css";

import { auth, db, storage } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from "firebase/firestore"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

export default function OrganizerProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState(null);
    const [phoneError, setPhoneError] = useState(""); // Add this line

    const [sidebarOpen, setSidebarOpen] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    photoURL: "",
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUid(currentUser.uid);
        try {
          const userAuthRef = doc(db, "users", currentUser.uid);
          const userAuthSnap = await getDoc(userAuthRef);

          if (userAuthSnap.exists()) {
            const userData = userAuthSnap.data();
            const orgDocRef = doc(db, "organizers", currentUser.uid);
            
            const unsubDoc = onSnapshot(orgDocRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setProfileData({
                  ...data,
                  name: data.name || userData.name || "",
                  email: data.email || userData.email || "",
                  phone: data.phone || userData.phone || ""
                });
              }
              setLoading(false);
            });
            return () => unsubDoc();
          }
        } catch (error) { setLoading(false); }
      } else { navigate("/signup"); }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Handle Input Changes
 // Updated Change Handler
const handleChange = (e) => {
  const { name, value } = e.target;
  
  if (name === "phone") {
    // Check if the input contains anything that IS NOT a number
    const containsLetters = /[^\d]/.test(value);
    
    // 1. Clean the value to keep only numbers for the state
    const cleaned = value.replace(/\D/g, ""); 
    setProfileData(prev => ({ ...prev, phone: cleaned }));

    // 2. Set the error message based on what happened
    if (containsLetters) {
      setPhoneError("Invalid input: Only numbers allowed");
    } else if (cleaned.length > 0 && cleaned.length < 10) {
      setPhoneError("Phone number must be at least 10 digits");
    } else {
      setPhoneError("");
    }
  } else {
    setProfileData(prev => ({ ...prev, [name]: value }));
  }
};
// Updated Save Handler
const handleSaveDetails = async () => {
  if (phoneError || profileData.phone.length < 10) {
    alert("Please enter a valid 10-digit phone number before saving.");
    return;
  }

  setSaving(true);
  try {
    const orgRef = doc(db, "organizers", uid);
    await setDoc(orgRef, {
      name: profileData.name,
      phone: profileData.phone
    }, { merge: true });
    alert("Profile updated successfully!");
  } catch (error) {
    alert("Error saving details: " + error.message);
  } finally {
    setSaving(false);
  }
};

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uid) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `organizer_profile/${uid}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await updateDoc(doc(db, "organizers", uid), { photoURL: downloadURL });
    } catch (error) { alert("Upload failed"); } 
    finally { setUploading(false); }
  };

  const handleRemovePhoto = async () => {
    if (window.confirm("Remove photo?")) {
      await updateDoc(doc(db, "organizers", uid), { photoURL: "" });
    }
  };

  if (loading) return <div className="loader">Loading...</div>;

  return (
    <div className="dashboard-layout">
<Sidebar 
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
      <div className="main-content-area" style={{ marginLeft: "260px" }}>
<Navbar onMenuClick={() => setSidebarOpen(prev => !prev)} />

        <div className="profile-content-container">
          <h2 className="section-main-title">My Profile</h2>
          
          <div className="profile-admin-card">
            <div className="avatar-admin-side">
              <div className="profile-circle-container">
                {uploading ? <div className="avatar-loader">...</div> : 
                  profileData.photoURL ? <img src={profileData.photoURL} className="admin-avatar-img" alt="User" /> : 
                  <div className="admin-avatar-placeholder">{profileData.name?.[0]}</div>
                }
              </div>
              <div className="photo-control-group">
                <button className="btn-upload-new" onClick={() => document.getElementById('p-input').click()}>
                  {uploading ? "Uploading..." : "Upload New Photo"}
                </button>
                <input id="p-input" type="file" hidden onChange={handleImageUpload} accept="image/*" />
                {profileData.photoURL && <button className="btn-remove-photo" onClick={handleRemovePhoto}>Remove Photo</button>}
              </div>
            </div>

            <div className="fields-admin-side">
              <div className="admin-input-group">
                <label>Name</label>
                <input type="text" name="name" className="admin-edit-input" value={profileData.name} onChange={handleChange} />
              </div>

              <div className="admin-input-group">
                <label>Email</label>
                <input type="email" className="admin-edit-input disabled-field" value={profileData.email} readOnly />
              </div>

              <div className="admin-input-group" style={{ position: "relative", marginBottom: "28px" }}>
  <label>Phone</label>
  <input 
    type="text" 
    name="phone" 
    className="admin-edit-input" 
    value={profileData.phone} 
    onChange={handleChange} 
    placeholder="Enter phone number" 
    maxLength="10"
    style={{ 
      borderColor: phoneError ? "#ef4444" : "",
      outlineColor: phoneError ? "#ef4444" : "" 
    }}
  />
  
  {/* This message will appear instantly if they type a letter */}
  {phoneError && (
    <span style={{ 
      color: "#ef4444", 
      fontSize: "11px", 
      position: "absolute", 
      bottom: "-18px", 
      left: "0",
      fontWeight: "500"
    }}>
      {phoneError}
    </span>
  )}
</div>

              <div className="admin-button-footer">
                <button className="btn-save-details" onClick={handleSaveDetails} disabled={saving}>
                  {saving ? "Saving..." : "Save Profile Details"}
                </button>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  );
}