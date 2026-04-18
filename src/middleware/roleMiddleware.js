module.exports = (requiredRole) => {
    return (req, res, next) => {
        // req.user is populated by the authMiddleware we wrote earlier
        if (!req.user || req.user.role !== requiredRole) {
            return res.status(403).json({
                message: `Access Denied: Requires ${requiredRole} privileges`
            });
        }
        next();
    };
};