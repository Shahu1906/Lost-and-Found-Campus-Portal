const db = require('../config/db');
const { uploadImageBuffer } = require('../utils/imageUploader');
const { foundReportSchema, updateFoundReportSchema } = require('../utils/validator');
const { triggerN8N } = require('../services/workflowService');

// Submit a found report for a lost item
exports.submitFoundReport = async (req, res) => {
    const { error } = foundReportSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { item_id, submitted_location, description } = req.body;

    try {
        // 1. Check if item exists and is 'lost'
        const item = await db.query('SELECT * FROM items WHERE id = $1 AND type = $2', [item_id, 'lost']);
        if (item.rows.length === 0) return res.status(404).json({ message: "Lost item not found" });

        // 2. Handle image upload
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadImageBuffer(req.file.buffer);
        }

        // 3. Insert Found Report
        const newReport = await db.query(
            `INSERT INTO found_reports (item_id, user_id, image_url, submitted_location, description) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [item_id, req.user.id, imageUrl, submitted_location, description]
        );

        // 4. Trigger n8n workflow
        await triggerN8N('new_found_report_submitted', {
            reportId: newReport.rows[0].id,
            itemId: item_id,
            userId: req.user.id
        });

        res.status(201).json({ success: true, report: newReport.rows[0] });
    } catch (err) {
        console.error('Submit Found Report Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Admin: Get found reports
exports.getFoundReportsAdmin = async (req, res) => {
    const { status } = req.query; // pending, approved, rejected
    try {
        let query = `
            SELECT 
                found_reports.*, 
                items.item_name, 
                items.image_url AS target_item_image,
                profiles.full_name AS student_name,
                profiles.reg_id AS student_reg_id,
                profiles.department AS student_dept
            FROM found_reports
            JOIN items ON found_reports.item_id = items.id
            JOIN profiles ON found_reports.user_id = profiles.id
        `;
        const queryParams = [];

        if (status) {
            query += ` WHERE found_reports.status = $1`;
            queryParams.push(status);
        }

        query += ` ORDER BY found_reports.created_at DESC`;

        const { rows } = await db.query(query, queryParams);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Admin: Verify/Update Found Report
exports.updateFoundReportStatus = async (req, res) => {
    const { reportId } = req.params;
    const { status, reason } = req.body; 

    try {
        const { error } = updateFoundReportSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const updatedReport = await db.query(
            `UPDATE found_reports SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *`,
            [status, reason, reportId]
        );

        if (updatedReport.rows.length === 0) return res.status(404).json({ message: "Found report not found" });

        // If approved, update original item status to 'found'
        if (status === 'approved') {
            const itemId = updatedReport.rows[0].item_id;
            await db.query('UPDATE items SET status = $1 WHERE id = $2', ['found', itemId]);

            // Trigger n8n for notifying the owner
            await triggerN8N('found_report_approved', {
                reportId,
                itemId,
                status
            });
        }

        res.json({ success: true, data: updatedReport.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
