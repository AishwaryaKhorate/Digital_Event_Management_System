import { Link, useLocation } from "react-router-dom";
import {
  FaHome,
  FaPlusCircle,
  FaTasks,
  FaUsers,
  FaClipboardList,
  FaImages,
  FaStar,
} from "react-icons/fa";

import "./Sidebar_o.css";

export default function Sidebar({ isOpen, onClose }) {
  const { pathname } = useLocation();

  const handleItemClick = () => {
    onClose(); // close sidebar on mobile
  };

  return (
    <>
      {/* MOBILE BACKDROP */}
      <div
        className={`sidebar-backdrop ${isOpen ? "show" : ""}`}
        onClick={onClose}
      ></div>

      <nav className={`sidebar ${isOpen ? "open" : ""}`} aria-label="Organizer sidebar">

        {/* Mobile close button */}
        <button className="sidebar-close" aria-label="Close sidebar" onClick={onClose}>
          ×
        </button>

        <div className="sidebar-logo">
  <div className="logo-block">
    <span className="logo-text">digiEvent</span>
  </div>
</div>


        <ul className="sidebar-menu">

          <li className={pathname === "/_o" ? "active" : ""} onClick={handleItemClick}>
            <Link to="/_o">
              <FaHome className="side-icon" />
              <span>Dashboard Home</span>
            </Link>
          </li>

          <li className={pathname === "/create-event_o" ? "active" : ""} onClick={handleItemClick}>
            <Link to="/create-event_o">
              <FaPlusCircle className="side-icon" />
              <span>Create New Event</span>
            </Link>
          </li>

          <li className={pathname === "/event-status_o" ? "active" : ""} onClick={handleItemClick}>
            <Link to="/event-status_o">
              <FaTasks className="side-icon" />
              <span>Event Status</span>
            </Link>
          </li>

          <li className={pathname === "/registered-students_o" ? "active" : ""} onClick={handleItemClick}>
            <Link to="/registered-students_o">
              <FaUsers className="side-icon" />
              <span>Registered Students</span>
            </Link>
          </li>

          <li className={pathname === "/attendance-management_o" ? "active" : ""} onClick={handleItemClick}>
            <Link to="/attendance-management_o">
              <FaClipboardList className="side-icon" />
              <span>Attendance Management</span>
            </Link>
          </li>

          <li className={pathname === "/highlights-upload_o" ? "active" : ""} onClick={handleItemClick}>
            <Link to="/highlights-upload_o">
              <FaImages className="side-icon" />
              <span>Highlights Upload</span>
            </Link>
          </li>

          <li className={pathname === "/feedback_o" ? "active" : ""} onClick={handleItemClick}>
            <Link to="/feedback_o">
              <FaStar className="side-icon" />
              <span>Feedback & Ratings</span>
            </Link>
          </li>

        </ul>
      </nav>
    </>
  );
}
