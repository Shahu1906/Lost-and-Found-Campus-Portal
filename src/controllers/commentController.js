const db = require('../config/db');

exports.addComment = async (req, res) => {
    const { itemId } = req.params;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ message: "Message is required" });
    }

    try {
        const itemCheck = await db.query('SELECT * FROM items WHERE id = $1', [itemId]);
        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ message: "Item not found" });
        }

        const newComment = await db.query(
            'INSERT INTO comments (item_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
            [itemId, req.user.id, message]
        );

        res.status(201).json({ success: true, comment: newComment.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getComments = async (req, res) => {
    const { itemId } = req.params;

    try {
        const query = `
            SELECT comments.*, profiles.full_name, profiles.role
            FROM comments
            JOIN profiles ON comments.user_id = profiles.id
            WHERE comments.item_id = $1
            ORDER BY comments.created_at ASC
        `;
        const { rows } = await db.query(query, [itemId]);
        
        res.status(200).json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
