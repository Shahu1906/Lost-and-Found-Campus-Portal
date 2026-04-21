const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const postController = require('../controllers/postController');
const claimController = require('../controllers/claimController');
const commentController = require('../controllers/commentController');
const foundReportController = require('../controllers/foundReportController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);
router.post('/post-item', authMiddleware, uploadMiddleware.single('image'), postController.createPost);
router.get('/posts', authMiddleware, postController.getPosts);
router.get('/my-posts', authMiddleware, postController.getUserPosts);
router.post('/claim-item', authMiddleware, uploadMiddleware.single('proof_image'), claimController.submitClaim);
router.get('/my-claims', authMiddleware, claimController.getUserClaims);

router.post('/report-found', authMiddleware, uploadMiddleware.single('image'), foundReportController.submitFoundReport);

router.post('/posts/:itemId/comments', authMiddleware, commentController.addComment);
router.get('/posts/:itemId/comments', authMiddleware, commentController.getComments);

module.exports = router;