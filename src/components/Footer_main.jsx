// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram } from "lucide-react";
import "../pages/Home.css"; // reuse original styles

const Footer = () => (
  <footer className="footer" role="contentinfo">
    <div className="container footer-grid">
      <div>
        <div className="logo-block footer-logo">
          <span className="logo-text">digiEvent</span>
        </div>
        <p className="muted">
          © {new Date().getFullYear()} digiEvent. All rights reserved.
        </p>
      </div>

      <div>
        <h4>Navigation</h4>
        <ul className="link-list">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/event">Events</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/about">Contact</Link></li>
        </ul>
      </div>

      <div>
        <h4>Legal</h4>
        <ul className="link-list">
          <li><Link to="/privacy-policy">Privacy Policy</Link></li>
          <li><Link to="/terms-of-service">Terms and Conditions</Link></li>
        </ul>
      </div>

      <div>
        <h4>Connect</h4>
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
  </footer>
);

export default Footer;
