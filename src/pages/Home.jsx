// src/pages/Home.jsx
import React from "react";
import Navbar from "../components/Navbar_main.jsx";
import Footer from "../components/Footer_main.jsx";
import { Link } from "react-router-dom";   
import "./Home.css";

const FeatureIcons = {
  "QR Attendance": "🔗",
  "Chatbot Support": "💬",
  "Auto Certificates": "🎖️",
  "Online Payments": "💳",
  "Analytics": "📈",
  "Attendee Mgmt": "🧑‍🤝‍🧑",
  "Event Discovery": "🗺️",
  "Multi-Platform": "💻",
};

const Slideshow = () => {
  const slides = [
    { url: "/home3.jpg", text: "Exciting Event Overview" },
    { url: "/home4.webp", text: "Keynote" },
    { url: "/home7.webp", text: "Keynote" },
    { url: "/home9.jpg", text: "Exciting Event Overview" },
    { url: "/home5.jpg", text: "Keynote" },
  ];
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI(v => (v + 1) % slides.length), 4000);
    return () => clearTimeout(t);
  }, [i, paused, slides.length]);

  return (
    <div className="slideshow" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="slide-wrap">
        <img
          src={slides[i].url}
          alt={slides[i].text}
          className="slide-image"
          onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/1000x560/4F46E5/ffffff?text=Event+Placeholder"; }}
        />
        <div className="overlay" />
      </div>
    </div>
  );
};

const FeaturesSection = () => {
  const features = [
    { title: "QR Attendance", description: "Enable quick, efficient entry with seamless check-in/out." },
    { title: "Chatbot Support", description: "Get instant assistance and FAQs answered 24/7 with AI." },
    { title: "Auto Certificates", description: "Generate and issue attendee certificates automatically upon completion." },
    { title: "Online Payments", description: "Securely process tickets and transactions with multiple options." },
    { title: "Analytics", description: "Gain deep insights into attendee engagement and event performance." },
    { title: "Attendee Mgmt", description: "Easily manage guest lists, communication, and segmentation." },
    { title: "Event Discovery", description: "Find and promote events to the right audience effortlessly." },
    { title: "Multi-Platform", description: "Access and manage events flawlessly across all devices." },
  ];

  return (
    <section className="features" aria-labelledby="features-title">
      <div className="container">
        <h2 id="features-title" className="section-title">Why Choose <span className="accent">digiEvent</span> ?</h2>
        <p><span></span></p>
        <div className="features-grid">
          {features.map((f, idx) => (
            <article className="feature-card" key={idx}>
              <div className="feature-icon" aria-hidden>{FeatureIcons[f.title] || '⭐'}</div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

const Home = () => (
  <div className="app-root home-shell">
    <Navbar />
    <main className="main-content_main">
      <div className="container">
        <div className="hero">
          <div className="hero-left">
            <h1 className="hero-title">
              Discover & Create <span className="accent block-md">Unforgettable Events</span>
            </h1>
            <p className="hero-sub">
              digiEvent is your all-in-one platform for event planning, promotion, and attendance
              management, designed to streamline your entire event lifecycle.
            </p>
            <div className="hero-ctas">
              <Link to="/event" className="btn btn-primary">Explore Events</Link>
              <Link to="/signup" className="btn btn-outline">Organize an Event</Link>
            </div>
          </div>

          <div className="hero-right">
            <Slideshow />
          </div>
        </div>
      </div>
    </main>
    <FeaturesSection />
    <Footer />
  </div>
);

export default Home;   