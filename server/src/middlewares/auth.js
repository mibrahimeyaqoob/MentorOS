import jwt from 'jsonwebtoken';

// 1. Verify standard authentication (Is the user logged in?)
export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Access Denied: Missing or invalid token.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains { id, roles }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Session expired or invalid.' });
    }
};

// 2. Verify Role-Based Access Control (Does the user have permission?)
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'User not authenticated.' });
        }

        const userRoles = req.user.roles ||[];

        // Super Admins bypass all locks
        if (userRoles.includes('super_admin')) {
            return next();
        }

        // Check if user has ANY of the required roles
        const hasPermission = allowedRoles.some(role => userRoles.includes(role));

        if (!hasPermission) {
            return res.status(403).json({ success: false, error: 'Access Denied: Insufficient clearance level.' });
        }

        next();
    };
};