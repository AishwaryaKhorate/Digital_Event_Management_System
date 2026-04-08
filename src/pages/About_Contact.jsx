import React, { useState } from "react";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, ShieldCheck, Zap, Globe } from 'lucide-react';
import Navbar from "../components/Navbar_main.jsx";
import Footer from "../components/Footer_main.jsx";
import "./About_Contact.css";

// Firebase imports
import { 
    db, 
    collection, 
    addDoc,
    serverTimestamp,
} from "../firebase"; 

const AboutSection = () => (
  <section className="about-section container" aria-labelledby="about-title">
    <h1 id="about-title" className="main-heading">About <span className="accent">digiEvent</span></h1>
    
    <div className="about-content">
      <p>
        <strong>digiEvent</strong> is a modern and intelligent event management platform specifically engineered to simplify how events are planned, discovered, and attended within colleges and professional organizations. Our core mission is to replace outdated, manual processes with a smart, digital, and seamless ecosystem. We make event participation effortless for everyone involved—from students and organizers to high-level administrators.
      </p>

      <p>
        Whether you are hosting a small technical workshop or a large-scale international seminar, digiEvent ensures a premium experience defined by accurate real-time attendance, instant communication updates, and secure online registrations. Founded to solve the persistent challenges faced during event coordination, our platform focuses on four key pillars: <strong>Clarity, Speed, Convenience, and Reliability.</strong>
      </p>

      {/* Feature Grid for a Premium Look */}
      <div className="premium-features-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px', 
          marginTop: '40px',
          marginBottom: '40px' 
      }}>
        <div className="feature-item" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Zap size={30} className="accent" style={{ marginBottom: '10px' }} />
          <h3 style={{ marginBottom: '8px' }}>For Organizers</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Create events, manage participants, handle payments through <strong>Razorpay</strong> and QR based Attendance marking.</p>
        </div>
        <div className="feature-item" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Globe size={30} className="accent" style={{ marginBottom: '10px' }} />
          <h3 style={{ marginBottom: '8px' }}>For Students</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Explore events, register quickly, and receive digital certificates in 24 hrs after completion.</p>
        </div>
        <div className="feature-item" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <ShieldCheck size={30} className="accent" style={{ marginBottom: '10px' }} />
          <h3 style={{ marginBottom: '8px' }}>For Admins</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>A powerful dashboard to approve events and monitor overall organization activity with full control.</p>
        </div>
      </div>

      <p>
        By leveraging our user-friendly interface and automated features, digiEvent becomes a trusted partner for conducting organized, efficient, and eco-friendly events. We are proud to offer secure online registrations <strong>powered by Razorpay</strong>, ensuring that your financial data is always protected by industry-leading encryption.
      </p><p></p>
    </div>
  </section>
);

const ContactSection = () => {
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('Sending message...');

    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        submittedAt: serverTimestamp(), 
    };

    try {
        await addDoc(collection(db, "contact_messages"), data);
        setStatus('Message Sent! We will get back to you soon. Thank you!');
        e.target.reset(); 
    } catch (error) {
        console.error("Error: ", error);
        setStatus('Failed to send message. Please try again later.');
    } finally {
        setIsSubmitting(false);
        setTimeout(() => setStatus(''), 5000); 
    }
  };

  return (
    <section className="contact-section container" aria-labelledby="contact-title">
      <h2 id="contact-title" className="sub-heading">Get in Touch</h2>

      <div className="contact-grid">
        <div className="contact-form-card">
          <p className="form-intro">
            Have a question or need support? Fill out the form below or reach out to us directly.
          </p>

          {status && (
            <div className={`status-message ${status.includes('Sent') ? 'success-message' : status.includes('Failed') ? 'error-message' : 'info-message'}`} role="alert">
                {status}
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input type="text" id="name" name="name" placeholder="Full Name" required disabled={isSubmitting} />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" name="email" placeholder="email@example.com" required disabled={isSubmitting} />
            </div>

            <div className="form-group message-group">
              <label htmlFor="message">Your Message</label>
              <textarea id="message" name="message" rows="4" placeholder="How can we help you today?" required disabled={isSubmitting} />
            </div>

            <button type="submit" className="btn btn-primary send-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        <div className="contact-info-card">
          <h3>Reach Out Directly</h3>
          <div className="contact-detail">
            <Mail size={18} className="info-icon" />
            <span>info@digievent.com</span>
          </div>

          <div className="contact-detail">
            <Phone size={18} className="info-icon" />
            <span>+91 1234567890</span>
          </div>

          <div className="contact-detail">
            <MapPin size={18} className="info-icon" />
            <span>123 Event St, Pune, Maharashtra, 411001</span>
          </div>

          

          <h3 className="follow-heading">Follow Us</h3>
          <div className="socials-info">
            <a
                        href="https://www.facebook.com/share/1APxL9QVBN/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="digiEvent Facebook"
                      >
                        <Facebook size={20} />
                      </a>
            
                      <a
                        href="https://x.com/1_digi83370"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="digiEvent Twitter"
                      >
                        <Twitter size={20} />
                      </a>
            
                      <a
                        href="https://www.instagram.com/Digi_Event.1"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="digiEvent Instagram"
                      >
                        <Instagram size={20} />
                      </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const About_Contact = () => (
  <div className="app-root">
    <Navbar activeLink="About" />
    <main style={{ minHeight: '80vh' }}>
      <AboutSection />
      <ContactSection />
    </main>
    <Footer />
  </div>
);

export default About_Contact;