const Review = require('../models/reviewModel');
const factory = require('../controllers/handlerFactory');

//middleware for creating review (adding tour to body)
exports.setTourUserIds = (req, res, next) => {
    //Allowing nested routes
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;
    next();
};

//factory functions are handling these functions.
exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
