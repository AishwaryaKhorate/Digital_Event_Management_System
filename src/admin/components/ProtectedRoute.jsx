// src/components/ProtectedRoute.jsx (Essential for Security)
// This code is correct and works without Auth Context.

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';

const ProtectedRoute = ({ children, requiredRole }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); 
    const [loading, setLoading] = useState(true);
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                // Fetch the custom claims for the role
                try {
                    const idTokenResult = await currentUser.getIdTokenResult();
                    setUser(currentUser);
                    setRole(idTokenResult.claims.role || 'student'); 
                } catch (error) {
                    setUser(null);
                }
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);

    if (loading) {
        return <div style={{textAlign: 'center', padding: '50px'}}>Checking access permissions...</div>;
    }

    if (!user) {
        // Not logged in
        return <Navigate to="/signup" replace />; 
    }

    // Role check: If role matches requirement OR is admin
    if (role === requiredRole || role === 'admin') {
        return children; // Access granted
    } else {
        // Role mismatch: Redirect to unauthorized page
        return <Navigate to="/" replace />; 
    }
};

export default ProtectedRoute;