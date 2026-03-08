import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const userRoles = user.roles || ['student'];

    // Super Admin bypass
    if (userRoles.includes('super_admin')) {
        return <Outlet />;
    }

    if (allowedRoles.length === 0) {
        return <Outlet />;
    }

    const hasAccess = allowedRoles.some(role => userRoles.includes(role));

    if (!hasAccess) {
        // If student tries to access admin, send to dashboard
        if (userRoles.includes('student') && userRoles.length === 1) {
            return <Navigate to="/student/dashboard" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}