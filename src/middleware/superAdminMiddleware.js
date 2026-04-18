const db = require('../config/db');

module.exports = async (req, res, next) => {
    try {
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
        if (!superAdminEmail) {
            return res.status(500).json({ message: 'Super admin not configured on server.' });
        }

        // Fetch current user's email from DB using the id set by authMiddleware
        const result = await db.query('SELECT email FROM profiles WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (result.rows[0].email !== superAdminEmail) {
            return res.status(403).json({ message: 'Forbidden: Only the Super Admin can perform this action.' });
        }

        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
