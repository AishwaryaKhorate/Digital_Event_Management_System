import React, { useEffect } from "react";
import Navbar from "../components/Navbar_main";
import Footer from "../components/Footer_main";

export default function TermsOfService() {
  
  // REPLACE YOUR OLD USEEFFECT WITH THIS ONE:
  useEffect(() => {
    const styleId = "legal-page-styles";
    let style = document.getElementById(styleId);
    
    // Check if style already exists, if not, create it
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    // Set the CSS inside
    style.innerHTML = `
      .legal-page { background: #f8fafc; padding: 40px 20px; }
      .legal-offset { margin-top: 90px; }
      .legal-container { max-width: 900px; margin: auto; background: #ffffff; padding: 48px; border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
      .legal-title { font-size: 1.8rem; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
      .updated { font-size: 0.85rem; color: #64748b; margin-bottom: 30px; }
      section { margin-top: 32px; }
      h2 { font-size: 1.25rem; color: #1e40af; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
      p, li { color: #334155; line-height: 1.7; }
      ul { padding-left: 18px; }
      .highlight-box { background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 15px; }
      .contact-card { background: #f1f5f9; padding: 25px; border-radius: 12px; margin-top: 20px; border: 1px solid #cbd5e1; }
    `;
    
    // This removes the style when the user leaves the page
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) document.head.removeChild(existingStyle);
    };
  }, []); // The [] means this only runs once when the page loads

  return (
    <>
      <Navbar />
      <div className="legal-page legal-offset">
        <div className="legal-container">
          <div className="legal-title">Terms and Conditions</div>
          <div className="updated">Last updated: January 2026</div>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing digiEvent, you agree to be bound by these Terms. All transactions are processed in INR via the <strong>Razorpay</strong> payment gateway.</p>
          </section>

          {/* RAZORPAY REQUIREMENT: REFUND & CANCELLATION */}
          <section>
            <h2>2. Cancellation & Refund Policy</h2>
            <p>Our focus is complete customer satisfaction. In the event, if you are displeased with the services provided, we will refund back the money, provided the reasons are genuine and proved after investigation.</p>
            <ul>
              <li><strong>Cancellations:</strong> Users can request cancellation of event registration up to 24 hours before the event start time.</li>
              <li><strong>Refunds:</strong> If an event is cancelled by the organizer, a full refund will be issued automatically. For user-initiated requests, refunds are processed within 5-7 working days to the original payment method.</li>
            </ul>
          </section>

          {/* RAZORPAY REQUIREMENT: SHIPPING (DIGITAL DELIVERY) */}
          <section>
            <h2>3. Shipping & Delivery Policy</h2>
            <p>digiEvent provides <strong>Digital Services</strong>. No physical products are shipped.</p>
            <div className="highlight-box">
              <p>Delivery of our services will be confirmed on your mail ID as specified during registration. For any points used on our platform, the same will be credited to your account dashboard instantly.</p>
            </div>
          </section>

          <section>
            <h2>4. User Responsibilities</h2>
            <ul>
              <li>Provide accurate and complete information for registrations.</li>
              <li>Use the platform only for lawful event-related purposes.</li>
              <li>Maintain the confidentiality of your account credentials.</li>
            </ul>
          </section>

          <section>
            <h2>5. Limitation of Liability</h2>
            <p>digiEvent shall not be liable for indirect, incidental, or consequential damages arising from platform usage or event participation.</p>
          </section>

          <section>
            <h2>6. Governing Law</h2>
            <p>These terms shall be governed by and constructed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Pune, Maharashtra.</p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}