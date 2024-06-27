const express = require('express');
const reviewController = require('../controllers/reviewsController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

//now these routes will work for both:
// POST /tour/23489dfjkdf/reviews
// POST /reviews

// All routes below are protected
router.use(authController.protect);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.setTourUserIds,
        reviewController.createReview,
    );

router
    .route('/:id')
    .get(reviewController.getReview)
    .delete(
        authController.restrictTo('user', 'admin'),
        reviewController.deleteReview,
    )
    .patch(
        authController.restrictTo('user', 'admin'),
        reviewController.updateReview,
    );

module.exports = router;
