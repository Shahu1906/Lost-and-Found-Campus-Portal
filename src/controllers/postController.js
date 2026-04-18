const db = require('../config/db');
const { uploadImage, uploadImageBuffer } = require('../utils/imageUploader');
const { postSchema } = require('../utils/validator');

exports.createPost = async (req, res) => {
    const { error } = postSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { type, category, item_name, description, location, geotag_lat, geotag_lng, image_data, lost_date } = req.body;

    try {
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadImageBuffer(req.file.buffer);
        } else if (image_data) {
            imageUrl = await uploadImage(image_data);
        }

        const newPost = await db.query(
            `INSERT INTO items (user_id, type, category, item_name, description, location_found, geotag_lat, geotag_lng, image_url, lost_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [req.user.id, type, category, item_name, description, location, geotag_lat, geotag_lng, imageUrl, lost_date || new Date()]
        );

        res.status(201).json({ success: true, post: newPost.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Community Feed: Get all posts with filters
exports.getPosts = async (req, res) => {
    const { category, location, date, type } = req.query;
    let query = `
        SELECT items.*, profiles.full_name, profiles.department 
        FROM items 
        JOIN profiles ON items.user_id = profiles.id 
        WHERE 1=1
    `;
    const params = [];

    if (category) {
        params.push(category);
        query += ` AND category = $${params.length}`;
    }
    if (location) {
        params.push(`%${location}%`);
        query += ` AND location_found ILIKE $${params.length}`;
    }
    if (date) {
        params.push(date);
        query += ` AND lost_date = $${params.length}`;
    }
    if (type) {
        params.push(type);
        query += ` AND type = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    try {
        const { rows } = await db.query(query, params);
        res.json({ success: true, count: rows.length, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Track My Posts
exports.getUserPosts = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};