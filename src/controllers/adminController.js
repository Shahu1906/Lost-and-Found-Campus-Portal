const db = require('../config/db');
const { triggerN8N } = require('../services/workflowService');
const bcrypt = require('bcryptjs');
const { registerSchema, handoverSchema } = require('../utils/validator');
const { uploadImageBuffer } = require('../utils/imageUploader');

// Create a new admin (Only allowed for the hardcoded SUPER_ADMIN)
exports.createAdmin = async (req, res) => {
    try {
        // 1. Get the current logged-in user's email
        const currentUserQuery = await db.query('SELECT email FROM profiles WHERE id = $1', [req.user.id]);
        if (currentUserQuery.rows.length === 0) {
            return res.status(404).json({ message: "Current user not found" });
        }
        const currentUserEmail = currentUserQuery.rows[0].email;

        // 2. Check if current user is the hardcoded super admin
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
        if (!superAdminEmail || currentUserEmail !== superAdminEmail) {
            return res.status(403).json({ message: "Forbidden: Only the super admin can perform this action." });
        }

        // 3. Validate request
        const { error } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { email, password, reg_id, full_name, dob, dept, div } = req.body;

        // 4. Check if user already exists
        const userExist = await db.query('SELECT * FROM profiles WHERE email = $1 OR reg_id = $2', [email, reg_id]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: "User with this Email or Registration ID already exists" });
        }

        // 5. Hash password and insert as admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.query(
            `INSERT INTO profiles (email, password_hash, reg_id, full_name, dob, department, division, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, role`,
            [email, hashedPassword, reg_id, full_name, dob, dept, div, 'admin']
        );

        res.status(201).json({ success: true, user: newUser.rows[0] });
    } catch (err) {
        console.error('Admin Creation Error:', err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
};

// Get all posts for admin (with student details)
exports.getAllPostsAdmin = async (req, res) => {
    try {
        const query = `
      SELECT items.*, profiles.full_name, profiles.department, profiles.reg_id 
      FROM items 
      JOIN profiles ON items.user_id = profiles.id 
      ORDER BY items.created_at DESC
    `;
        const { rows } = await db.query(query);
        res.status(200).json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin action: Verify a post or Approve a claim
exports.updatePostStatus = async (req, res) => {
    const { itemId } = req.params;
    const { status, admin_notes } = req.body; // e.g., 'verified_by_admin' or 'claimed'

    try {
        const updatedPost = await db.query(
            `UPDATE items SET status = $1 WHERE id = $2 RETURNING *`,
            [status, itemId]
        );

        if (updatedPost.rows.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Logic: If status is 'claimed' or 'verified_by_admin', we trigger an n8n workflow
        if (status === 'claimed' || status === 'verified_by_admin') {
            await triggerN8N('post_status_updated', {
                itemId,
                status,
                admin_notes,
                item: updatedPost.rows[0]
            });
        }

        res.status(200).json({ success: true, data: updatedPost.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Super Admin: Toggle activation of any user (student or admin)
exports.toggleUserActivation = async (req, res) => {
    const { userId } = req.params;

    try {
        // 1. Prevent super admin from deactivating themselves
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ message: 'You cannot deactivate your own super admin account.' });
        }

        // 2. Check if the target user exists
        const userCheck = await db.query(
            'SELECT id, email, role, is_active FROM profiles WHERE id = $1',
            [userId]
        );
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const targetUser = userCheck.rows[0];
        const newStatus = !targetUser.is_active; // toggle

        // 3. Update is_active
        await db.query('UPDATE profiles SET is_active = $1 WHERE id = $2', [newStatus, userId]);

        res.status(200).json({
            success: true,
            message: `User "${targetUser.email}" (role: ${targetUser.role}) has been ${newStatus ? 'activated' : 'deactivated'}.`,
            is_active: newStatus
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Handover the item to the student
exports.handoverItem = async (req, res) => {
    const { error } = handoverSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { item_id, claim_id, latitude, longitude } = req.body;

    try {
        // 1. Verify claim exists and is linked to the item
        const claim = await db.query('SELECT * FROM claims WHERE id = $1 AND item_id = $2', [claim_id, item_id]);
        if (claim.rows.length === 0) return res.status(404).json({ message: "Claim not found for this item" });

        // 2. Handle handover photo
        let handoverPhotoUrl = '';
        if (req.file) {
            handoverPhotoUrl = await uploadImageBuffer(req.file.buffer);
        }

        // 3. Update claim with handover details
        await db.query(
            `UPDATE claims SET handover_lat = $1, handover_lng = $2, handover_photo_url = $3, handed_over_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [latitude, longitude, handoverPhotoUrl, claim_id]
        );

        // 4. Update item status to 'returned'
        const updatedItem = await db.query(
            `UPDATE items SET status = $1 WHERE id = $2 RETURNING *`,
            ['returned', item_id]
        );

        // 5. Trigger n8n workflow for final handover
        await triggerN8N('item_handed_over', {
            itemId: item_id,
            claimId: claim_id,
            latitude,
            longitude,
            handoverPhotoUrl,
            item: updatedItem.rows[0]
        });

        res.json({ success: true, message: "Item successfully handed over", data: updatedItem.rows[0] });
    } catch (err) {
        console.error('Handover Error:', err);
        res.status(500).json({ error: err.message });
    }
};