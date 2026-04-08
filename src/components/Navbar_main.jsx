// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";

import "./Navbar_main.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(v => !v);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <header className="navbar_main" role="banner">
      <div className="nav-inner">

        {/* LEFT: logo */}
        <div className="nav-left">
          <div className="logo-block" aria-hidden>
            <span className="logo-text">digiEvent</span>
          </div>
        </div>

        {/* CENTER: links */}
        <nav className="nav-center nav-links" aria-label="Primary navigation">
          <NavLink to="/" className={({isActive}) => isActive ? "active" : ""}>Home</NavLink>
          <NavLink to="/event" className={({isActive}) => isActive ? "active" : ""}>Events</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? "active" : ""}>About</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? "active" : ""}>Contact</NavLink>
        </nav>

        {/* RIGHT: CTA + hamburger */}
        <div className="nav-right">
          <div className="cta-desktop">
            <Link to="/signup" className=" btn-primary-light">Sign up / Login</Link>
          </div>

          <button
            className={`mobile-toggle ${isOpen ? "open" : ""}`}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            onClick={toggle}
            type="button"
          >
            <span className="hamburger" aria-hidden>
              <span className="bar bar1" />
              <span className="bar bar2" />
              <span className="bar bar3" />
            </span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mobile-menu-outer open" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <nav className="mobile-links" aria-label="Mobile navigation">
              <NavLink to="/" className={({isActive}) => isActive ? "mobile-link-btn active" : "mobile-link-btn"} onClick={close}>Home</NavLink>
              <NavLink to="/event" className={({isActive}) => isActive ? "mobile-link-btn active" : "mobile-link-btn"} onClick={close}>Events</NavLink>
              <NavLink to="/about" className={({isActive}) => isActive ? "mobile-link-btn active" : "mobile-link-btn"} onClick={close}>About</NavLink>
              <NavLink to="/about" className={({isActive}) => isActive ? "mobile-link-btn active" : "mobile-link-btn"} onClick={close}>Contact</NavLink>
            </nav>

            <div className="mobile-cta-stack">
              <Link to="/signup" className="btn btn-primary mobile-full" onClick={close}>Sign up / Login</Link>
              <Link to="/signup" className="btn btn-outline_main mobile-full" onClick={close}>Organize an Event</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
