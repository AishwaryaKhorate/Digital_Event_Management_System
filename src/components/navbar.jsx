import { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import profilePic from "../assets/profile.jpg";
import { auth, db, doc, getDoc, onAuthStateChanged } from "../firebase";

export default function Navbar({ onMenuClick }) {
  const [currentPhoto, setCurrentPhoto] = useState(null); 
  const navigate = useNavigate();

  // Fetch profile image
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "student_profile", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().photo) {
          setCurrentPhoto(docSnap.data().photo);
        }
      } else {
        setCurrentPhoto(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Live instant update when user changes profile photo
  useEffect(() => {
    const handleUpdate = (e) => setCurrentPhoto(e.detail);
    window.addEventListener("profileImageUpdated", handleUpdate);
    return () => window.removeEventListener("profileImageUpdated", handleUpdate);
  }, []);

  const styles = {
    navbar: {
      width: "100%",
      height: "70px",
      backgroundColor: "#0066ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 1000,
      boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
    },
    leftContainer: {
      display: "flex",
      alignItems: "center",
      gap: "12px"
    },
    logoBox: {
      display: "flex",
      alignItems: "center",
      fontSize: "22px",
      color: "white"
    },
    logoBold: { fontWeight: "700" },
    logoThin: { fontWeight: "400", marginLeft: "3px" },
    rightIconsContainer: { 
      display: "flex", 
      alignItems: "center", 
      gap: "20px" 
    },
    chatIcon: { 
      color: "white", 
      cursor: "pointer", 
      width: "26px", 
      height: "26px" 
    },
    profileImg: { 
      width: "38px",
      height: "38px",
      borderRadius: "50%",
      objectFit: "cover",
      border: "none",
      cursor: "pointer"
    }
  };

  return (
    <div style={styles.navbar}>

      {/* LEFT SIDE — MENU + LOGO */}
      <div style={styles.leftContainer}>
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          ☰
        </button>

      </div>

      {/* RIGHT SIDE — CHAT + PROFILE */}
      <div style={styles.rightIconsContainer}>
        <NavLink to="/chatbot">
          <svg 
            style={styles.chatIcon} 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </NavLink>
<NavLink 
  to="/profile" 
  style={({ isActive }) => ({
    background: "transparent",
    textDecoration: "none",
    padding: 0,
    display: "flex"
  })}
>
  <img 
    className="nav-profile-img"
    src={currentPhoto || profilePic} 
    alt="profile"
    style={styles.profileImg}
  />
</NavLink>
      </div>
    </div>
  );
}
