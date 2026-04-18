// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import Routes
const studentRoutes = require('./routes/studentRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import Database Connection (Triggers the pool connection log)
const db = require('./config/db');
const bcrypt = require('bcryptjs');

const app = express();

// --- 1. Global Middleware ---
app.use(helmet());               // Secure HTTP headers
app.use(cors());                 // Allow cross-origin requests (for Android App)
app.use(morgan('dev'));          // HTTP request logger
app.use(express.json({ limit: '10mb' }));  // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- 2. API Routes ---
// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'Healthy',
        timestamp: new Date().toISOString(),
        service: 'Lost-Found-College-API'
    });
});

// Main Feature Routes
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/admin', adminRoutes);

// --- 3. Error Handling Middleware ---
// 404 Handler
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route Not Found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

// Seed Admin Logic
const seedAdmin = async () => {
    try {
        const superEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@college.edu';
        const superPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

        const adminCheck = await db.query('SELECT * FROM profiles WHERE email = $1', [superEmail]);
        if (adminCheck.rows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(superPassword, salt);
            await db.query(`INSERT INTO profiles (email, password_hash, reg_id, full_name, department, role) 
            VALUES ($1, $2, $3, $4, $5, $6)`, [superEmail, hashedPassword, 'ADMIN-001', 'System Administrator', 'Administration', 'admin']);
            console.log(`Seed: Super Admin created (${superEmail} / ${superPassword})`);
        } else {
            console.log('Seed: Super Admin already exists, skipping.');
        }
    } catch (err) {
        console.error('Failed to seed admin:', err.message);
    }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    await seedAdmin();
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;