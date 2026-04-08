// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// --- LEGAL PAGES ---
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import TermsOfService from "./pages/TermsOfService.jsx";
// --- NEW IMPORTS FOR SECURITY ---
import ActionHandler from "../src/admin/components/ActionHandler.jsx"; // Component to process the invitation link
import ProtectedRoute from "../src/admin/components/ProtectedRoute.jsx"; // Component to enforce role security
// ---------------------------------

import Home from "./pages/Home.jsx";
import Event from "./pages/Event.jsx";
import About_Contact from "./pages/About_Contact.jsx";
import Signup from "./pages/signuppage.jsx";
import Chatbot from "./pages/chatbot.jsx";

import Home_student from "./pages/Home_student.jsx";
import Explore from "./pages/Explore.jsx";
import Notifications from "./pages/Notifications.jsx";
import Highlights from "./pages/Highlights.jsx";
import Feedback from "./pages/Feedback.jsx";
import Profile from "./pages/profile.jsx";
import Register from "./pages/Register.jsx"; 

import Dashboard_a from "./admin/pages/Dashboard_a.jsx";
import AdminApprovalList_a from "./admin/pages/AdminApprovalList_a.jsx";
import UserManagement_a from "./admin/pages/UserManagement_a.jsx";
import Reports_a from "./admin/pages/Reports_a.jsx";
import Feedback_a from "./admin/pages/Feedback_a.jsx";
import Notifications_a from "./admin/pages/Notifications_a.jsx";
import Profile_a from "./admin/pages/Profile_a.jsx";

// Organizer routes (will be protected)
import DashboardHome from "./pages/DashboardHome_o.jsx";
import CreateEvent from "./pages/CreateEvent_o.jsx";
import EventStatus from "./pages/EventStatus_o.jsx";
import RegisteredStudents from "./pages/RegisteredStudents_o.jsx";
import HighlightsUpload from "./pages/HighlightsUpload_o.jsx";
import FeedbackRatings from "./pages/FeedbackRatings_o.jsx";
import Notifications_o from "./pages/Notifications_o.jsx"; // ⭐️ CRITICAL FIX
import AttendanceManagement from "./pages/AttendanceManagement_o.jsx";
import OrganizerProfile from "./pages/OrganizerProfile_o.jsx";
import OrganizerEventsDetails from "./pages/OrganizerEventsDetails_o.jsx";

import "./App.css";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import VerifyCertificate from "./pages/VerifyCertificate";


export default function App() {
  return (
    
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Home />} />
        <Route path="/event" element={<Event />} />
        <Route path="/about" element={<About_Contact />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chatbot" element={<Chatbot />} />
        
        {/* --- NEW ROUTE FOR ORGANIZER INVITATION LINK --- */}
        {/* The user lands here after clicking the email link to set their password/sign in */}
        <Route path="/auth-action" element={<ActionHandler />} />
        {/* ---------- LEGAL ---------- */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        
        
        {/* Route for Unauthorized Access */}
        <Route path="/unauthorized" element={<div style={{padding:'50px', color:'red'}}>Error 403: Access Denied. You do not have the required role to view this page.</div>} />


        {/* --- STUDENT ROUTES (Requires Login/Authentication, assuming students have a default role) --- */}
        <Route path="/student_dashboard" element={<ProtectedRoute requiredRole="student"><Home_student /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute requiredRole="student"><Explore /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute requiredRole="student"><Notifications /></ProtectedRoute>} />
        <Route path="/highlights" element={<ProtectedRoute requiredRole="student"><Highlights /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute requiredRole="student"><Feedback /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute requiredRole="student"><Profile /></ProtectedRoute>} />
        <Route path="/register" element={<ProtectedRoute requiredRole="student"><Register /></ProtectedRoute>} />

       {/* Verification page route*/}
        <Route path="/verify" element={<VerifyCertificate />} />


        {/* --- ADMIN ROUTES (Requires 'admin' role) --- */}
        <Route path="/admin_dashboard" element={<ProtectedRoute requiredRole="admin"><Dashboard_a /></ProtectedRoute>} />
        <Route path="/admin/admin/events_a" element={<ProtectedRoute requiredRole="admin"><AdminApprovalList_a /></ProtectedRoute>} />
        <Route path="/admin/users_a" element={<ProtectedRoute requiredRole="admin"><UserManagement_a /></ProtectedRoute>} />
        <Route path="/admin/reports_a" element={<ProtectedRoute requiredRole="admin"><Reports_a /></ProtectedRoute>} />
        <Route path="/admin/feedback_a" element={<ProtectedRoute requiredRole="admin"><Feedback_a /></ProtectedRoute>} />
        <Route path="/admin/notifications_a" element={<ProtectedRoute requiredRole="admin"><Notifications_a /></ProtectedRoute>} />
        <Route path="/admin/profile_a" element={<ProtectedRoute requiredRole="admin"><Profile_a /></ProtectedRoute>} />

        {/* --- ORGANIZER ROUTES (Requires 'organizer' role) --- */}
        
        <Route path="/_o" element={<ProtectedRoute requiredRole="organizer"><DashboardHome /></ProtectedRoute>} />
        <Route path="/create-event_o" element={<ProtectedRoute requiredRole="organizer"><CreateEvent /></ProtectedRoute>} />
        <Route path="/event-status_o" element={<ProtectedRoute requiredRole="organizer"><EventStatus /></ProtectedRoute>} />
        <Route path="/registered-students_o" element={<ProtectedRoute requiredRole="organizer"><RegisteredStudents /></ProtectedRoute>} />
        <Route path="/attendance-management_o" element={<ProtectedRoute requiredRole="organizer"><AttendanceManagement /></ProtectedRoute>} />
        <Route path="/highlights-upload_o" element={<ProtectedRoute requiredRole="organizer"><HighlightsUpload /></ProtectedRoute>} />
        <Route path="/feedback_o" element={<ProtectedRoute requiredRole="organizer"><FeedbackRatings /></ProtectedRoute>} />
        <Route path="/notifications_o" element={<Notifications_o />} />
        <Route path="/organizer-profile_o" element={<ProtectedRoute requiredRole="organizer"><OrganizerProfile /></ProtectedRoute>} />
        <Route path="/organizer-events" element={<ProtectedRoute requiredRole="organizer"><OrganizerEventsDetails /></ProtectedRoute>} />
        <Route path="/registration-success" element={<RegistrationSuccess />}

        
        
/>

      </Routes>
  
  );
}