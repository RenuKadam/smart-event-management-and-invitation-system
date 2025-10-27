const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
    try {
        // 1) Get token from header
        let token;
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        try {
            // 2) Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3) Check if user still exists
            const currentUser = await User.findById(decoded.id).select('-password');
            
            if (!currentUser) {
                return res.status(401).json({
                    success: false,
                    message: 'The user belonging to this token no longer exists.'
                });
            }

            // 4) Check if user is active
            if (!currentUser.isActive) {
                return res.status(401).json({
                    success: false,
                    message: 'This user account has been deactivated.'
                });
            }

            // 5) Check if user changed password after token was issued
            if (currentUser.passwordChangedAt) {
                const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
                
                if (decoded.iat < changedTimestamp) {
                    return res.status(401).json({
                        success: false,
                        message: 'User recently changed password. Please log in again.'
                    });
                }
            }

            // Grant access to protected route
            req.user = currentUser;
            next();
        } catch (err) {
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. Please log in again.'
                });
            }
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Your token has expired. Please log in again.'
                });
            }
            throw err;
        }
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed. Please try again.'
        });
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        try {
            // Check if user exists and has a role
            if (!req.user || !req.user.role) {
                console.error('User or role not found:', req.user);
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to perform this action'
                });
            }

            // Check if user's role is allowed
            if (!roles.includes(req.user.role)) {
                console.error('Invalid role:', {
                    userRole: req.user.role,
                    requiredRoles: roles
                });
                return res.status(403).json({
                    success: false,
                    message: `This action requires one of the following roles: ${roles.join(', ')}`
                });
            }

            next();
        } catch (error) {
            console.error('Role verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Role verification failed'
            });
        }
    };
};

module.exports = { protect, restrictTo }; 