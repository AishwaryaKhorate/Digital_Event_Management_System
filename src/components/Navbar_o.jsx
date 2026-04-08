import { Link, useNavigate } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { useState, useEffect } from "react";
import "./Navbar_o.css";

import { auth, db } from "../firebase";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const [photoURL, setPhotoURL] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // 🔵 AUTH + PROFILE + NOTIFICATIONS
  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const profileUnsub = onSnapshot(doc(db, "organizers", user.uid), (snap) => {
          if (snap.exists()) setPhotoURL(snap.data().photoURL);
        });

        const notifUnsub = onSnapshot(
          query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            where("read", "==", false)
          ),
          (snap) => setUnreadCount(snap.size)
        );

        return () => {
          profileUnsub();
          notifUnsub();
        };
      } else {
        setPhotoURL(null);
        setUnreadCount(0);
      }
    });

    return () => authUnsub();
  }, []);

  // 🔴 LOGOUT
  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      await signOut(auth);
      navigate("/signup");
    }
  };

  return (
    <nav className="navbar_o">

  {/* LEFT BLOCK — Logo + Menu below it (mobile only) */}
  
      <button className="nav-toggle" onClick={onMenuClick}>
        <span className="hamburger"></span>
      </button>


  {/* RIGHT BLOCK (unchanged) */}
  <div className="nav-right">
      <button className="nav-logout-btn" onClick={handleLogout}>
        <FaSignOutAlt /><span>Logout</span>
      </button>

      <Link to="/notifications_o" className="nav-bell">
        🔔
        {unreadCount > 0 && <span className="nav-notif-badge" />}
      </Link>

      <Link to="/organizer-profile_o">
        {photoURL ? (
          <img src={photoURL} className="navbar-profile-img" alt="Profile" />
        ) : (
          <FaUserCircle className="profile-icon" />
        )}
      </Link>
  </div>

</nav>

  );
}
