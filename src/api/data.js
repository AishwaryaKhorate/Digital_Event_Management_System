// src/api/data.js

// --- Mock Data Mocks ---
// Replace these functions with your actual database fetching logic (e.g., Firebase, Axios)

export const fetchDashboardStats = () => new Promise(resolve => setTimeout(() => resolve({
    attended: 15, 
    certificates: 12, 
    rating: 4.5
}), 300));

export const fetchRecentActivity = () => new Promise(resolve => setTimeout(() => resolve([
    { id: 1, text: 'You registered for <b>"Generative AI in Event Management"</b>.', time: 'Just now', icon: 'Calendar' },
    { id: 2, text: 'Downloaded certificate for <b>"Web Development Conference 2023"</b>.', time: '2 hours ago', icon: 'Download' },
    { id: 3, text: 'Submitted feedback for <b>"Digital Marketing Summit"</b>.', time: 'Yesterday', icon: 'Message' },
]), 300));

export const fetchUpcomingEvents = () => new Promise(resolve => setTimeout(() => resolve([
    { id: 101, title: "Innovation & Tech Expo 2024", date: "November 15, 2024 • 9:00 AM", location: "Virtual • Online Platform", imageUrl: "/event1.jpg" },
    { id: 102, title: "Career Opportunities in Digital Media", date: "December 5, 2024 • 2:00 PM", location: "University Auditorium", imageUrl: "/event2.jpg" },
    { id: 103, title: "Sustainability in Practice Forum", date: "January 20, 2025 • 10:00 AM", location: "Conference Hall A", imageUrl: "/event3.jpg" },
]), 300));