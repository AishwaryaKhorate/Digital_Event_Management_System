import React, { useEffect, useState, useCallback } from "react";
import { auth, db, storage } from "../../firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Sidebar, Topbar } from "../components/UIComponents";
import "../styles/app.css";

const ProfileStyles = () => (
    <style jsx="true">{`
        .profile-page-wrapper {
            padding: 40px;
            display: flex;
            justify-content: center;
        }
        .profile-card-modern {
            width: 100%;
            max-width: 850px;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.03);
            border: 1px solid #f0f2f5;
            overflow: hidden;
        }
        .card-header-banner {
            height: 120px;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            position: relative;
        }
        .profile-body {
            padding: 0 40px 40px 40px;
            position: relative;
        }
        .avatar-overlap-wrapper {
            margin-top: -60px;
            margin-bottom: 30px;
            display: flex;
            align-items: flex-end;
            gap: 24px;
        }
        .avatar-main {
            width: 130px;
            height: 130px;
            border-radius: 50%;
            border: 5px solid #fff;
            background: #f8fafc;
            object-fit: cover;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .avatar-placeholder-main {
            width: 130px;
            height: 130px;
            border-radius: 50%;
            border: 5px solid #fff;
            background: #eef2ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: #4f46e5;
            font-weight: 700;
        }

        /* Standardized Buttons - Height 42px */
        .btn-flex-row { display: flex; gap: 12px; }
        .btn-standard {
            height: 42px;
            padding: 0 20px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            white-space: nowrap;
        }
        .btn-primary-purple { background: #7c3aed; color: #fff; }
        .btn-primary-purple:hover { background: #6d28d9; transform: translateY(-1px); }
        
        .btn-ghost-danger { background: #fff; color: #ef4444; border: 1px solid #fee2e2; }
        .btn-ghost-danger:hover { background: #fef2f2; }

        .btn-save-final { background: #7c3aed; color: #fff; width: 160px; margin-left: auto; }
        .btn-save-final:hover { background: #6d28d9; }

        /* Form Structure */
        .form-section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .input-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }
        .full-span { grid-column: span 2; }
        .field-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 8px;
        }
        .custom-input {
            width: 100%;
            height: 46px;
            background: #fcfdfe;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 0 16px;
            font-size: 15px;
            transition: all 0.2s;
        }
        .custom-input:focus {
            border-color: #7c3aed;
            background: #fff;
            outline: none;
            box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
        }
        .custom-input:read-only {
            background: #f8fafc;
            color: #94a3b8;
            cursor: not-allowed;
        }
    `}</style>
);

export default function Profile_a() {
      const [mobileOpen, setMobileOpen] = useState(false);
    
    const [uid, setUid] = useState(null);
    const [user, setUser] = useState({ name: "", email: "", phone: "" });
    const [phoneError, setPhoneError] = useState(""); // Add this line
    const [avatarSrc, setAvatarSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const broadcastUpdate = (url) => {
        window.dispatchEvent(new CustomEvent("admin-profile-updated", { detail: url }));
    };

    const fetchProfile = useCallback(async (userId) => {
        try {
            const docRef = doc(db, "users", userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUser({
                    name: data.name || "",
                    phone: data.phone || "",
                    email: auth.currentUser?.email || ""
                });
                setAvatarSrc(data.photoURL || null);
            }
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (u) { setUid(u.uid); fetchProfile(u.uid); }
            else { setLoading(false); }
        });
        return () => unsubscribe();
    }, [fetchProfile]);

    const onFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !uid) return;
        setIsSaving(true);
        try {
            const storageRef = ref(storage, `admin_profiles/${uid}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setAvatarSrc(url);
            await setDoc(doc(db, "users", uid), { photoURL: url }, { merge: true });
            broadcastUpdate(url);
        } catch (err) { alert("Upload failed."); } 
        finally { setIsSaving(false); }
    };

    const removeAvatar = async () => {
        if (!uid || !window.confirm("Remove photo?")) return;
        setIsSaving(true);
        try {
            setAvatarSrc(null);
            await setDoc(doc(db, "users", uid), { photoURL: "" }, { merge: true });
            broadcastUpdate(null);
        } catch (err) { alert("Error."); } 
        finally { setIsSaving(false); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await setDoc(doc(db, "users", uid), {
                name: user.name,
                phone: user.phone,
                lastUpdated: serverTimestamp()
            }, { merge: true });
            alert("Profile updated successfully!");
        } catch (err) { alert("Save failed."); } 
        finally { setIsSaving(false); }
    };

    if (loading) return <div style={{padding: '100px', textAlign: 'center'}}>Loading Account...</div>;
const handlePhoneChange = (e) => {
    const value = e.target.value;
    
    // 1. Detect if the user typed letters or symbols
    const containsNonDigits = /[^\d]/.test(value);
    
    // 2. Clean the value to keep only numbers
    const cleaned = value.replace(/\D/g, ""); 
    
    // 3. Update the state with the cleaned numbers
    setUser({ ...user, phone: cleaned });

    // 4. Set the error message priority
    if (containsNonDigits) {
        setPhoneError("Invalid input: Only numbers are allowed");
    } else if (cleaned.length > 0 && cleaned.length < 10) {
        setPhoneError("Phone number must be at least 10 digits");
    } else {
        setPhoneError("");
    }
};
    return (
<div className="admin-scope app-layout">
            <ProfileStyles />
<Sidebar 
  collapsed={!mobileOpen}
  className={mobileOpen ? "open" : ""} 
  onClose={() => setMobileOpen(false)} 
/>
                 <div className="main-layout">
            <Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />
            
                <main className="content-area">
                    <div className="profile-page-wrapper">
                        <div className="profile-card-modern">
                            <div className="card-header-banner"></div>
                            
                            <div className="profile-body">
                                <div className="avatar-overlap-wrapper">
                                    {avatarSrc ? (
                                        <img src={avatarSrc} className="avatar-main" alt="User" />
                                    ) : (
                                        <div className="avatar-placeholder-main">{user.name ? user.name[0].toUpperCase() : 'A'}</div>
                                    )}
                                    <div className="btn-flex-row">
                                        <label className="btn-standard btn-primary-purple">
                                            {isSaving ? "Uploading..." : "Update Photo"}
                                            <input type="file" hidden onChange={onFileChange} accept="image/*" disabled={isSaving} />
                                        </label>
                                        <button onClick={removeAvatar} className="btn-standard btn-ghost-danger" disabled={isSaving}>
                                            Remove
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleSave}>
                                    <h2 className="form-section-title">Personal Information</h2>
                                    
                                    <div className="input-grid">
                                        <div className="form-group full-span">
                                            <label className="field-label">Display Name</label>
                                            <input 
                                                className="custom-input" 
                                                value={user.name} 
                                                onChange={(e) => setUser({...user, name: e.target.value})}
                                                placeholder="Enter your full name"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="field-label">Email Address</label>
                                            <input className="custom-input" value={user.email} readOnly />
                                        </div>

                                        <div className="form-group">
                                            <label className="field-label">Access Role</label>
                                            <input className="custom-input" value="Administrator" readOnly />
                                        </div>
<div className="form-group full-span" style={{ position: "relative", marginBottom: "30px" }}>
    <label className="field-label">Contact Number</label>
    <input 
        className="custom-input" 
        type="text"
        value={user.phone} 
        onChange={handlePhoneChange} 
        placeholder="Enter 10-digit contact number"
        maxLength="10"
        style={{ 
            borderColor: phoneError ? "#ef4444" : "#e2e8f0",
            outlineColor: phoneError ? "#ef4444" : "" 
        }}
    />
    
    {/* Absolute positioning prevents layout shifts or overlapping */}
    {phoneError && (
        <span style={{ 
            color: "#ef4444", 
            fontSize: "12px", 
            position: "absolute",
            bottom: "-18px", 
            left: "0",
            fontWeight: "500"
        }}>
            {phoneError}
        </span>
    )}
</div>
                                    </div>

                                    <div style={{ display: 'flex', marginTop: '40px' }}>
                                        <button 
    type="submit" 
    className="btn-standard btn-save-final" 
    // Button is disabled if: currently saving OR there's a phone error OR phone is too short
    disabled={isSaving || phoneError !== "" || user.phone.length < 10}
    style={{
        opacity: (isSaving || phoneError !== "" || user.phone.length < 10) ? 0.6 : 1,
        cursor: (isSaving || phoneError !== "" || user.phone.length < 10) ? "not-allowed" : "pointer"
    }}
>
    {isSaving ? "Saving..." : "Save Changes"}
</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            {mobileOpen && (
  <div
    className="overlay"
    onClick={() => setMobileOpen(false)}
  />
)}
            
        </div>
    );
}