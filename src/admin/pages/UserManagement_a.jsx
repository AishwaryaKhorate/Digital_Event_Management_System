// src/pages/UserManagement_a.jsx

import React, { useState, useEffect } from "react"; // ⭐️ ADD useState ⭐️
import { useLocation, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase"; 
import { collection, getDocs } from "firebase/firestore"; 
import { getFunctions, httpsCallable } from "firebase/functions";
import { signOut } from "firebase/auth"; 
import { Sidebar, Topbar } from "../components/UIComponents";
import "../styles/app.css";

const USER_COLLECTION = "users"; 

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const getRoleBadgeStyles = (role) => {
    const r = role ? role.toLowerCase() : "student";
    
    if (r === "admin" || r === "administrator") {
        return { color: '#065f46', background: '#d1fae5', text: role }; 
    } 
    if (r === "organizer") {
        return { color: '#92400e', background: '#fef3c7', text: role }; 
    }
    return { color: '#1e40af', background: '#dbeafe', text: role }; 
};

export default function UserManagement_a() {
    const [mobileOpen, setMobileOpen] = useState(false);
    
    const param = useQuery().get("q") || "";
    const navigate = useNavigate(); 
    const [query, setQuery] = useState(param);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // ⭐️ NEW STATE for Invitation Modal ⭐️
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    
    // Using the confirmed region 'us-central1' 
    const functions = getFunctions(undefined, 'us-central1'); 
    
    const updateUserRole = httpsCallable(functions, 'updateUserRoleSecure');
    const deleteUser = httpsCallable(functions, 'deleteUserSecure');
    // ⭐️ NEW CLOUD FUNCTION CALL ⭐️
    const inviteOrganizer = httpsCallable(functions, 'inviteOrganizerSecure');


    // --- LOGOUT HANDLER (Unchanged) ---
    const handleLogout = () => {
        signOut(auth)
            .then(() => {
                console.log("User signed out.");
                navigate('/login'); 
            })
            .catch((error) => {
                console.error("Logout Error:", error);
                alert("Error during sign-out.");
            });
    };

    // --- FETCH USERS (Unchanged) ---
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersCollectionRef = collection(db, USER_COLLECTION);
            const snapshot = await getDocs(usersCollectionRef); 
            
            const fetchedUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || data.displayName || "N/A", // Ensure this field exists in your DB
                    email: data.email || "N/A",
                    events: data.events || 0,
                    role: data.role || "student",
                };
            });

            setUsers(fetchedUsers);
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error("Firestore fetch failed:", err);
            setError(`Failed to fetch users. Error: ${err.message || err.toString()}`);
            setLoading(false);
        }
    };
    
    // --- PROACTIVE TOKEN REFRESH & INITIAL LOAD (Unchanged) ---
    useEffect(() => {
        fetchUsers();

        const tokenRefreshInterval = setInterval(() => {
            if (auth.currentUser) {
                auth.currentUser.getIdToken(true) 
                    .then(() => console.log('Firebase token refreshed successfully.'))
                    .catch((err) => console.error('Error refreshing token:', err));
            }
        }, 50 * 60 * 1000); 

        return () => clearInterval(tokenRefreshInterval);
    }, []); 


    // --- IMPLEMENTED ACTIONS (ChangeRole and DeleteUser are unchanged) ---

    // 1. Change Role (Secure via Cloud Function)
    const handleChangeRole = async (user) => {
        const currentRole = user.role.toLowerCase();
        const newRole = currentRole === 'organizer' ? 'student' : 'organizer';
        
        if (!window.confirm(`Are you sure you want to change ${user.name}'s role from ${currentRole} to ${newRole}?`)) {
            return;
        }
        
        try {
            await auth.currentUser.getIdToken(true); 

            if (!auth.currentUser) {
                alert("Session invalid after refresh. Please log in.");
                handleLogout();
                return;
            }

            await updateUserRole({ userId: user.id, newRole: newRole, userName: user.name });
            
            alert(`Success! Role securely updated to ${newRole} for ${user.name}.`);
            fetchUsers();
            
        } catch (error) {
            console.error("Error changing role via Cloud Function:", error);
            
            if (error.code === 'unauthenticated') {
                alert("⚠️ Session Expired. You will now be logged out. Please log back in.");
                handleLogout(); 
            } else if (error.code === 'permission-denied') {
                 alert("⛔ Permission Denied: Only a Super Admin can perform this action.");
            } else if (error.code === 'internal') {
                 alert("❌ Server Error: An internal error occurred. Check Firebase Cloud Function logs for details.");
            } else {
                alert(`Failed to change user role: ${error.message || error.toString()}`);
            }
        }
    };
    
    // 2. Remove User (Secure via Cloud Function)
    const handleRemoveUser = async (userId, userName) => {
        
        if (auth.currentUser && auth.currentUser.uid === userId) {
            alert("You cannot delete your own admin account from here.");
            return;
        }
        
        if (!window.confirm(`⚠️ Are you sure you want to PERMANENTLY remove user: ${userName}?`)) {
            return;
        }
        
        try {
            await auth.currentUser.getIdToken(true); 

            if (!auth.currentUser) {
                alert("Session invalid after refresh. Please log in.");
                handleLogout();
                return;
            }

            await deleteUser({ userId: userId , userName: userName });
            
            alert(`Success! User ${userName} securely deleted.`);
            fetchUsers();
            
        } catch (error) {
            console.error("Error removing user via Cloud Function:", error);
            
            if (error.code === 'unauthenticated') {
                alert("⚠️ Session Expired. You will now be logged out. Please log back in.");
                handleLogout(); 
            } else if (error.code === 'permission-denied') {
                 alert("⛔ Permission Denied: Only a Super Admin can delete users.");
            } else if (error.code === 'internal') {
                 alert("❌ Server Error: An internal error occurred. Check Firebase Cloud Function logs for details.");
            } else {
                alert(`Failed to remove user: ${error.message || error.toString()}`);
            }
        }
    };
    
    // 3. Invite Organizer (IMPLEMENTED VIA CLOUD FUNCTION)
    const handleInviteUser = async () => {
        if (!inviteEmail) {
            alert("Please enter a valid email address.");
            return;
        }
        
        // Simple email validation
        if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
            alert("Please enter a valid email format (e.g., user@domain.com).");
            return;
        }

        try {
            // Force token refresh before calling the function
            await auth.currentUser.getIdToken(true); 

            if (!auth.currentUser) {
                alert("Session invalid after refresh. Please log in.");
                handleLogout();
                return;
            }

            // Call the secure Cloud Function
            await inviteOrganizer({ email: inviteEmail });
            
            alert(`Invitation successfully processed for ${inviteEmail}. The user will be assigned the 'organizer' role upon using the invitation link.`);
            
            // Close modal and reset state
            setInviteEmail("");
            setIsInviteModalOpen(false);
            
        } catch (error) {
            console.error("Error inviting organizer via Cloud Function:", error);
            
            if (error.code === 'unauthenticated') {
                alert("⚠️ Session Expired. Please log in.");
                handleLogout(); 
            } else if (error.code === 'permission-denied') {
                 alert("⛔ Permission Denied: Only an Admin can invite new users.");
            } else if (error.code === 'already-exists') {
                 alert(`✅ User with email ${inviteEmail} already exists and has been successfully promoted to Organizer.`);
                 setInviteEmail("");
                 setIsInviteModalOpen(false);
            } else {
                alert(`Failed to invite user: ${error.message || error.toString()}`);
            }
        }
    };

    // --- Filtering and Rendering (Unchanged) ---
    const filtered =
        query && query.trim()
            ? users.filter(
                  (u) =>
                      u.name.toLowerCase().includes(query.toLowerCase()) ||
                      u.email.toLowerCase().includes(query.toLowerCase())
              )
            : users;

    // ... (Loading and Error JSX are unchanged) ...
    if (loading) {
  return (
    <div className="admin-scope app-layout">
     <Sidebar
  className={mobileOpen ? "open" : ""}
  onClose={() => setMobileOpen(false)}
/>


      <div className="main-layout">
        <Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />

        <main className="content-area" style={{ padding: '24px', textAlign: 'center' }}>
          <h2>Connecting to Database...</h2>
        </main>
      </div>
    </div>
  );
}


    if (error) { 
        return (
            <div className="app-layout">
<Sidebar
  className={mobileOpen ? "open" : ""}
  onClose={() => setMobileOpen(false)}
/>

                      <div className="main-layout" style={{ marginLeft: "260px" }}>
                <Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} />
                
                    <main className="content-area" style={{ padding: '24px', textAlign: 'center', color: 'red' }}>
                        <h2>Connection Error</h2>
                        <p>Error: {error}</p>
                        <p>Please check your Firebase Security Rules or function deployment.</p>
                    </main>
                </div>
            </div>
        );
    }

    return (
<div className="admin-scope app-layout">
<Sidebar
  className={mobileOpen ? "open" : ""}
  onClose={() => setMobileOpen(false)}
/>
                <div className="main-layout">
            <Topbar onMenuClick={() => setMobileOpen(!mobileOpen)} >
            
                    <button onClick={handleLogout} style={{ padding: '8px 15px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}>
                        Admin Logout
                    </button>
                </Topbar>

                <main className="content-area user-management-page">
  <div className="page" style={{ padding: '24px' }}>

                        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h1>User Management</h1>
                            <div className="page-actions" style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    placeholder="Search users..." value={query} onChange={(e) => setQuery(e.target.value)}
                                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                                {/* ⭐️ UPDATED BUTTON ACTION: Open Modal ⭐️ */}
                                <button onClick={() => setIsInviteModalOpen(true)} style={{ padding: '8px 15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    Invite Organizer
                                </button>
                            </div>
                        </div>

                        <div className="table-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Role</th> 
                                        <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>{query ? "No users match your search criteria." : "No users found."}</td></tr>
                                    ) : (
                                        filtered.map((u) => {
                                            const badgeStyle = getRoleBadgeStyles(u.role);
                                            const isSelf = auth.currentUser && auth.currentUser.uid === u.id;
                                            const nextRoleText = u.role.toLowerCase() === 'organizer' ? 'Demote to Student' : 'Promote to Organizer';

                                            return (
                                                <tr key={u.id}>
                                                    <td data-label="Name" style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>{u.name}</td>
                                                    <td  data-label="Email" style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>{u.email}</td>
                                                    <td data-label="Role" style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                                                        <span
                                                            style={{ padding: '4px 8px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', color: badgeStyle.color, background: badgeStyle.background }}
                                                        >
                                                            {badgeStyle.text}
                                                        </span>
                                                    </td>
                                                    <td data-label="Actions" style={{ padding: '8px 16px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                        
                                                        {/* CHANGE ROLE (SECURE VIA CLOUD FUNCTION) */}
                                                        {u.role.toLowerCase() !== 'admin' && (
                                                            <button onClick={() => handleChangeRole(u)} title={nextRoleText} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', margin: '0 5px', color: '#22c55e' }}>
                                                                🔄
                                                            </button>
                                                        )}

                                                        {/* REMOVE USER (SECURE VIA CLOUD FUNCTION) */}
                                                        {!isSelf && u.role.toLowerCase() !== 'admin' && (
                                                            <button onClick={() => handleRemoveUser(u.id, u.name)} title={`Securely remove ${u.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', margin: '0 5px', color: '#ef4444' }}>
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
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

            {/* ⭐️ NEW: INVITE ORGANIZER MODAL JSX ⭐️ */}
            {isInviteModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', minWidth: '350px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0 }}>Invite New Organizer</h3>
                        <p>Enter the email address of the person you wish to grant 'organizer' privileges to.</p>
                        <input
                            type="email"
                            placeholder="Organizer Email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            style={{ width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setIsInviteModalOpen(false)} style={{ padding: '8px 15px', background: '#ccc', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={handleInviteUser} style={{ padding: '8px 15px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Send Invitation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
    );
}