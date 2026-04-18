const db = require('../config/db');
const { uploadImage, uploadImageBuffer } = require('../utils/imageUploader');
const { claimSchema } = require('../utils/validator');
const { triggerN8N } = require('../services/workflowService');

// Submit a claim for a found item
exports.submitClaim = async (req, res) => {
    const { error } = claimSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { item_id, proof_type, proof_details } = req.body;

    try {
        // 1. Check if item exists and is 'found'
        const item = await db.query('SELECT * FROM items WHERE id = $1 AND type = $2', [item_id, 'found']);
        if (item.rows.length === 0) return res.status(404).json({ message: "Found item not found" });

        // 2. Handle proof (if it's a photo/bill, upload to Cloudinary if it's base64, buffer, otherwise assume URL)
        let finalProofDetails = proof_details || '';
        
        if (req.file) {
            finalProofDetails = await uploadImageBuffer(req.file.buffer);
        } else if (proof_type !== 'in_person_meet' && finalProofDetails.startsWith('data:image')) {
            finalProofDetails = await uploadImage(finalProofDetails);
        }

        // 3. Insert Claim
        const newClaim = await db.query(
            `INSERT INTO claims (item_id, user_id, proof_type, proof_details) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [item_id, req.user.id, proof_type, finalProofDetails]
        );

        // 4. Update Item status to 'pending' if it was 'verified_by_admin'
        await db.query('UPDATE items SET status = $1 WHERE id = $2', ['pending', item_id]);

        // 5. Notify admin via n8n
        await triggerN8N('new_claim_submitted', {
            claimId: newClaim.rows[0].id,
            itemId: item_id,
            userId: req.user.id
        });

        res.status(201).json({ success: true, claim: newClaim.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Get all claims for a specific item
exports.getClaimsByItem = async (req, res) => {
    const { itemId } = req.params;
    try {
        const query = `
            SELECT claims.*, profiles.full_name, profiles.reg_id, profiles.department 
            FROM claims 
            JOIN profiles ON claims.user_id = profiles.id 
            WHERE claims.item_id = $1
        `;
        const { rows } = await db.query(query, [itemId]);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Approve/Reject Claim
exports.updateClaimStatus = async (req, res) => {
    const { claimId } = req.params;
    const { status, admin_notes } = req.body; // approved, rejected, pending_verification

    try {
        const updatedClaim = await db.query(
            `UPDATE claims SET status = $1, admin_notes = $2 WHERE id = $3 RETURNING *`,
            [status, admin_notes, claimId]
        );

        if (updatedClaim.rows.length === 0) return res.status(404).json({ message: "Claim not found" });

        // If approved, mark item as 'claimed'
        if (status === 'approved') {
            await db.query('UPDATE items SET status = $1 WHERE id = $2', ['claimed', updatedClaim.rows[0].item_id]);
        }

        // Notify user via n8n
        await triggerN8N('claim_status_updated', {
            claimId,
            status,
            admin_notes
        });

        res.json({ success: true, data: updatedClaim.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Student: Get all claims submitted by the current user
exports.getUserClaims = async (req, res) => {
    try {
        const query = `
            SELECT claims.*, items.item_name, items.description, items.image_url, items.location_found, items.status AS item_status
            FROM claims
            JOIN items ON claims.item_id = items.id
            WHERE claims.user_id = $1
            ORDER BY claims.created_at DESC
        `;
        const { rows } = await db.query(query, [req.user.id]);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
