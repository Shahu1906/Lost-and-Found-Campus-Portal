const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const postController = require('../controllers/postController');
const claimController = require('../controllers/claimController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const superAdminMiddleware = require('../middleware/superAdminMiddleware');
const foundReportController = require('../controllers/foundReportController');
const uploadMiddleware = require('../middleware/uploadMiddleware');

const authController = require('../controllers/authController');

// Admin Login Route (Public)
router.post('/login', authController.login);

// Only allow Admins to access these
router.use(authMiddleware, roleMiddleware('admin'));

router.post('/create-admin', adminController.createAdmin);

router.get('/all-posts', adminController.getAllPostsAdmin);
router.get('/community-view', postController.getPosts); // Admin version of community view
router.patch('/update-status/:itemId', adminController.updatePostStatus);
router.get('/claims/:itemId', claimController.getClaimsByItem);
router.get('/all-claims', claimController.getAllClaimsAdmin);
router.patch('/update-claim/:claimId', claimController.updateClaimStatus);

router.post('/handover-item', uploadMiddleware.single('handover_photo'), adminController.handoverItem);
router.get('/found-reports', foundReportController.getFoundReportsAdmin);
router.patch('/update-found-report/:reportId', foundReportController.updateFoundReportStatus);

// Super Admin only
router.patch('/toggle-user/:userId', superAdminMiddleware, adminController.toggleUserActivation);

module.exports = router;