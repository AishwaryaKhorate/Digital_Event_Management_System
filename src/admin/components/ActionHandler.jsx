// src/components/ActionHandler.jsx (Direct Dashboard Jump Logic)

import React, { useEffect, useState } from 'react';
import { getAuth, applyActionCode, checkActionCode, signInWithEmailAndPassword } from 'firebase/auth';
import { useLocation, useNavigate } from 'react-router-dom';

const ActionHandler = () => {
    const auth = getAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [message, setMessage] = useState('Processing invitation link...');
    const [email, setEmail] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    const query = new URLSearchParams(location.search);
    const mode = query.get('mode');
    const oobCode = query.get('oobCode');

    useEffect(() => {
        if (!oobCode || mode !== 'resetPassword') {
            setMessage('Invalid or missing action code. Please check the link.');
            return;
        }

        // 1. Verify the code and get the target email
        checkActionCode(auth, oobCode)
            .then((info) => {
                setEmail(info.data.email);
                setMessage(`Welcome, ${info.data.email}! Set your password to access the Organizer Dashboard.`);
                setShowPasswordForm(true);
            })
            .catch(() => {
                setMessage('The invitation link is invalid or expired.');
            });
    }, [oobCode, mode, auth]);

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setMessage('Password must be at least 6 characters.');
            return;
        }

        try {
            setMessage('Activating account and setting password...');
            
            // 2. Apply the code and set the password
            await applyActionCode(auth, oobCode, newPassword);
            
            // 3. Sign the user in immediately
            await signInWithEmailAndPassword(auth, email, newPassword);

            setMessage('Success! Securing your Organizer role...');

            // 4. ⭐ CRITICAL: FORCE TOKEN REFRESH ⭐
            // This is the key to immediately loading the { role: 'organizer' } claim.
            await auth.currentUser.getIdToken(true); 
            
            // 5. DIRECT JUMP: Navigate straight to the Organizer Dashboard
            // NOTE: The ProtectedRoute will verify the role is 'organizer' before rendering
            navigate('/_o'); // Navigate to your primary organizer route

        } catch (error) {
            setMessage(`Error: ${error.message}. Please check your credentials.`);
            console.error("Activation/Login Error:", error);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #0056b3', borderRadius: '8px' }}>
            <h2>Organizer Account Activation</h2>
            <p>{message}</p>
            {showPasswordForm && (
                <form onSubmit={handlePasswordSubmit}>
                    <p>Account Email: <strong>{email}</strong></p>
                    <input 
                        type="password" 
                        placeholder="New Password (min 6 chars)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <button type="submit">Set Password and Go to Dashboard</button>
                </form>
            )}
        </div>
    );
};

export default ActionHandler;