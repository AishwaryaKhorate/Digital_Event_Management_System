// src/pages/signuppage.jsx
import React, { useState, useEffect } from "react";
import "./signuppage.css";
import { Menu, X, Eye, EyeOff } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  setDoc,
  doc,
  serverTimestamp,
  signInWithEmailAndPassword,
  getDoc,
  signInWithPopup,
  googleProvider,
  updateProfile,
  sendPasswordResetEmail,
} from "../firebase";

// --- Navbar Component ---
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
      <div className="nav-inner container"> 
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

// --- Footer Component ---
const Footer = () => (
  <footer className="footer-simple" role="contentinfo">
    <p className="muted">© {new Date().getFullYear()} digiEvent. All rights reserved.</p>
  </footer>
);

// --- Admin email ---
const ADMIN_EMAIL = "admin@gmail.com"; 

// --- Auth Form Component ---
const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(true); 
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [messageType, setMessageType] = useState("error");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // --- NEW STATE FOR PASSWORD RESET ---
  const [isResetFlow, setIsResetFlow] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Helper: create Firestore user doc if missing
 const ensureUserDoc = async (uid, name, email) => {
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        // --- NEW USER REGISTRATION ---
        // If the user doesn't exist, we create them. 
        // Default is 'student'. You can manually change this to 'organizer' in Firebase Console later.
        let role = "student"; 
        if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          role = "admin";
        }

        await setDoc(userRef, {
          uid,
          name: name || "",
          email: email || "",
          role: role, 
          createdAt: serverTimestamp(),
        });

        // Initialize the basic profile based on the default role
        const profileRef = role === "student" 
          ? doc(db, "student_profile", uid) 
          : doc(db, "organizers", uid);

        await setDoc(profileRef, {
          name: name || "",
          email: email || "",

           attendedCount: 0,
  certificatesCount: 0,

          createdAt: serverTimestamp(),
        }, { merge: true });

        return role;
      } else {
        // --- RETURNING USER LOGIN ---
        // We fetch the EXACT role from the database
        const userData = snap.data();
        console.log("User role from DB:", userData.role);
        return userData.role || "student"; 
      }
    } catch (err) {
      console.error("Error in ensureUserDoc:", err);
      throw err;
    }
  };

  // Standard email/password signup
  const handleSignUp = async (form) => {
    if (!agreedToTerms) {
    setMessageType("error"); 
    setMessage("You must agree to the Terms and Conditions to create an account.");
    return;
  }
    const name = (form.get("name") || "").trim(); 
    const email = (form.get("email") || "").trim().toLowerCase();
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword"); 
    

    if (!email || !password) {
      setMessageType("error"); 
      setMessage("Please enter email and password.");
      return;
    }
    
    if (isSignUp && password !== confirmPassword) {
      setMessageType("error"); 
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;

      // --- ADDED: Update the Firebase Auth Profile ---
      // This ensures that res.user.displayName is set to the actual name
      // instead of remaining null or defaulting to the email.
      await updateProfile(res.user, {
        displayName: name
      });

      // create user doc
      const role = await ensureUserDoc(uid, name, email); 
      
      if (role === "admin") navigate("/admin_dashboard");
      else if (role === "organizer") navigate("/_o"); // Added leading slash for consistency
      else navigate("/student_dashboard");
      
    } catch (err) {
      console.error("Signup error:", err);
      setMessageType("error"); 
      setMessage(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };
  // Standard email/password login
  const handleLogin = async (form) => {
    const email = (form.get("email") || "").trim().toLowerCase();
    const password = form.get("password");

    if (!email || !password) {
      setMessageType("error"); 
      setMessage("Please enter email and password.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const user = res.user;

      const role = await ensureUserDoc(user.uid, user.displayName, user.email);

      if (role === "admin") navigate("/admin_dashboard");
      else if (role === "organizer") navigate("/_o");
      else navigate("/student_dashboard");
      
    } catch (err) {
      console.error("Login error:", err);
      setMessageType("error"); 
      setMessage(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  // Google auth flow
  const handleGoogle = async () => {
    setLoading(true);
    setMessage("");
    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const uid = user.uid;
      const name = user.displayName || ""; 
      const email = (user.email || "").toLowerCase();

      const role = await ensureUserDoc(uid, name, email);

      if (role === "admin") navigate("/admin_dashboard");
      else if (role === "organizer") navigate("/_o");
      else navigate("/student_dashboard");
    
    } catch (err) {
      console.error("Google sign error:", err);
      setMessageType("error"); 
      const msg = err?.message || "Google sign-in failed.";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    if (isSignUp) await handleSignUp(form);
    else await handleLogin(form);
  };

  const handleToggle = (isSignUpValue) => {
    setIsSignUp(isSignUpValue);
    setIsResetFlow(false); 
    setMessage(""); 
    setResetEmail("");
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setMessage("Please enter your email to receive a password reset link.");
      return;
    }
    
    setLoading(true);
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setMessageType("success");      
      setMessage(`A reset link has been sent to ${resetEmail}. Check your inbox`);
      setIsResetFlow(false); 
      setResetEmail(""); 
    } catch (err) {
      console.error("Password reset error:", err);
      setMessageType("error"); 
      let errorMsg = "Failed to send reset email. Please check the email address.";
      if (err.code === 'auth/user-not-found') {
        setMessageType("error"); 
        errorMsg = "No account found with that email address.";
      }
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container container">
      <div className="welcome-block">
        <h1 className="title-text">
          Get Started with <br />
          Seamless Access
        </h1>
        <p className="subtitle-text">
          Unlock your potential with digiEvent. Sign up for a new account or log in to continue your journey.
        </p>

        <div className="illustration-wrapper" aria-hidden>
          <div className="illustration-placeholder">
            <img
              src="./signup.png"
              alt="Illustration"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/400x250/3498DB/F8F9FA?text=digiEvent+Auth"; 
              }}
            />
          </div>
        </div>
      </div>

      <div className={`auth-form-card ${isSignUp && !isResetFlow ? "signup-outline" : ""}`}>
        <header className="card-header">
          <h2 className="card-title">
            {isResetFlow ? "Reset Password" : (isSignUp ? "Sign Up" : "Login")}
          </h2>
          {!isResetFlow && (
            <div className="toggle-switch-container">
              <span className="toggle-label">Login</span>
              <button
                className={`toggle-switch ${isSignUp ? "active" : ""}`}
                onClick={() => handleToggle(!isSignUp)}
                aria-checked={isSignUp}
                role="switch"
                aria-label={`Switch to ${isSignUp ? "Login" : "Sign Up"}`}
                type="button"
              >
                <span className="slider" />
              </button>
              <span className="toggle-label">Sign Up</span>
            </div>
          )}
        </header>

        <p className="welcome-message">
          {isResetFlow 
             ? "Enter your email to receive a password reset link." 
             : (isSignUp ? "Enter your details to create an account." : "Welcome back! Please enter your details.")
          }
        </p>

        {message && (
          <div className="error-message" role="alert" style={{ color: messageType === "error" ? "red" : "green" }}>
            {message}
          </div>
        )}
        
        {isResetFlow ? (
          <form onSubmit={handleForgotPassword} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="resetEmail">Email</label>
              <input 
                id="resetEmail" 
                name="resetEmail" 
                type="email" 
                placeholder="name@example.com" 
                value={resetEmail}
                onChange={(e) => {
                    setResetEmail(e.target.value);
                    setMessage(""); 
                }}
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary main-auth-btn" disabled={loading}>
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary back-to-login-btn" 
              onClick={() => handleToggle(false)} 
            >
              Back to Login
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleFormSubmit} className="auth-form" noValidate>
              {isSignUp && (
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" placeholder="Your full name" required={isSignUp} />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" placeholder="name@example.com" required />
              </div>

{/* --- Password Field --- */}
<div className="form-group">
  <label htmlFor="password">Password</label>
  <div style={{ position: 'relative', width: '100%' }}>
    <input 
      id="password" 
      name="password" 
      type={showPassword ? "text" : "password"} 
      placeholder="********" 
      required 
      style={{ width: '100%', paddingRight: '45px' }} 
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#6b7280',
        padding: '0'
      }}
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</div>

{/* --- Confirm Password Field (Only shows during Sign Up) --- */}
{isSignUp && !isResetFlow && (
  <div className="form-group" style={{ marginTop: '10px' }}>
    <label htmlFor="confirmPassword">Confirm Password</label>
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        id="confirmPassword"
        name="confirmPassword"
        type={showConfirmPassword ? "text" : "password"}
        placeholder="********"
        required={isSignUp}
        style={{ width: '100%', paddingRight: '45px' }}
      />
      <button
        type="button"
        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#6b7280',
          padding: '0'
        }}
      >
        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
)}
              {/* --- THE NEW CHECKBOX BLOCK --- */}
{isSignUp && (
  <div className="terms-checkbox-container" style={{ display: 'flex', gap: '10px', marginTop: '15px', marginBottom: '15px' }}>
    <input 
      type="checkbox" 
      id="agreeTerms"
      checked={agreedToTerms} 
      onChange={(e) => setAgreedToTerms(e.target.checked)}
      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
    />
    <label htmlFor="agreeTerms" style={{ fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}>
      I agree to the <Link to="/terms-of-service" target="_blank" style={{ color: '#1e40af', fontWeight: 'bold' }}>Terms of Conditions</Link> and <Link to="/privacy-policy" target="_blank" style={{ color: '#1e40af', fontWeight: 'bold' }}>Privacy Policy</Link>
    </label>
  </div>
)}

              {!isSignUp && (
                <div className="forgot-password">
                  <button type="button" onClick={() => {
                        setIsResetFlow(true);
                        setMessage("");
                    }}>
                      Forgot Password?
                  </button>
                </div>
              )}

              <button type="submit" className="btn btn-primary main-auth-btn" disabled={loading}>
                {loading ? (isSignUp ? "Creating account..." : "Signing in...") : isSignUp ? "Sign Up" : "Login"}
              </button>
            </form>

            <div className="separator">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="btn btn-outline-google"
              onClick={handleGoogle}
              disabled={loading}
              aria-label="Continue with Google"
            >
              <img src="./google.png" alt="Google icon" className="google-icon" />
              <span>{isSignUp ? "Sign up with Google" : "Sign in with Google"}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const Signup = () => (
  <>
    <div className="app-root">
      <Navbar />
      <main>
        <AuthForm />
      </main>
      <Footer />
    </div>
  </>
);

export default Signup;