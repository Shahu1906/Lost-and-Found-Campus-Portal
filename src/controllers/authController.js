const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { registerSchema } = require('../utils/validator');

exports.register = async (req, res) => {
    // 1. Validate request
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, password, reg_id, full_name, dob, dept, div, role } = req.body;

    try {
        const userExist = await db.query('SELECT * FROM profiles WHERE email = $1 OR reg_id = $2', [email, reg_id]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: "User with this Email or Registration ID already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.query(
            `INSERT INTO profiles (email, password_hash, reg_id, full_name, dob, department, division, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, role`,
            [email, hashedPassword, reg_id, full_name, dob, dept, div, 'student']
        );

        res.status(201).json({ success: true, user: newUser.rows[0] });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await db.query('SELECT * FROM profiles WHERE email = $1', [email]);
        if (user.rows.length === 0) return res.status(404).json({ message: "User not found" });

        // Check if account is active
        if (user.rows[0].is_active === false) {
            return res.status(403).json({ message: "Your account has been deactivated. Contact admin." });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1d' }
        );

        res.json({ success: true, token, role: user.rows[0].role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await db.query('SELECT id, email, reg_id, full_name, dob, department, division, role, created_at FROM profiles WHERE id = $1', [req.user.id]);
        if (user.rows.length === 0) return res.status(404).json({ message: "User not found" });
        res.json({ success: true, profile: user.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};