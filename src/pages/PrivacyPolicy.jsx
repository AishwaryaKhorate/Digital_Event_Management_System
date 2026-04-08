import React, { useEffect } from "react";
import Navbar from "../components/Navbar_main";
import Footer from "../components/Footer_main";
export default function PrivacyPolicy() {
  
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
          <div className="legal-title">Privacy Policy</div>
          <div className="updated">Last updated: January 2026</div>

          <section>
            <h2>1. Information We Collect</h2>
            <ul>
              <li><strong>Identity Data:</strong> Name, username, and professional identifiers.</li>
              <li><strong>Contact Data:</strong> Email address and phone numbers.</li>
              <li><strong>Transaction Data:</strong> Details of payments processed via <strong>Razorpay</strong> (Note: We do not store card PINs or CVV).</li>
            </ul>
          </section>

          <section>
            <h2>2. Payment Security</h2>
            <p>All payments are processed through Razorpay. They adhere to the standards set by PCI-DSS as managed by the PCI Security Standards Council, which is a joint effort of brands like Visa, MasterCard, American Express and Discover.</p>
          </section>

          <section>
            <h2>3. Data Usage & Sharing</h2>
            <p>digiEvent does not sell or rent personal data. Information is shared only with authorized event organizers you register with or when required by law to comply with legal processes.</p>
          </section>

          <section>
            <h2>4. Security Measures</h2>
            <p>Reasonable technical and organizational safeguards are implemented to protect user data against unauthorized access, including SSL encryption for all data transfers.</p>
          </section>

          {/* RAZORPAY REQUIREMENT: PHYSICAL CONTACT INFO */}
          <section>
            <h2>5. Contact & Grievance Officer</h2>
            <p>If you have any questions about this Privacy Policy or the practices of this site, please contact us at:</p>
            <div className="contact-card">
              <p><strong>Name:</strong> [Your Name or Company Name]</p>
              <p><strong>Address:</strong> [Flat/House No, Building, Area, Pune, Maharashtra, 411001]</p>
              <p><strong>Email:</strong> support@digievent.com</p>
              <p><strong>Phone:</strong> +91 1234567890</p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}