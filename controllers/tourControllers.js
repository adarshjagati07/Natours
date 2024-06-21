const Tour = require('./../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllTours = catchAsync(async (req, res, next) => {
    // EXECUTE QUERY
    const features = new APIFeatures(Tour.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    const tours = await features.query;

    // SEND RESPONSE
    res.status(200).json({
        status: 'success',
        requestedAt: req.requestTime,
        results: tours.length,
        data: {
            tours: tours,
        },
    });
});

// now this is working as the middleware to set the query for us
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = 5;
    req.query.sort = '-ratingsAverage price';
    req.query.fields = 'name price ratingAverage summary difficulty';
    next();
};

exports.getTour = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    // const tour = await Tour.find({ _id: id });
    const tour = await Tour.findById(id);
    if (!tour) {
        return next(new AppError(`Could not found tour with id: ${id}!`, 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            tour: tour,
        },
    });
});

exports.createTour = catchAsync(async (req, res, next) => {
    // const newTour = new Tour({});
    // newTour.save();

    const newTour = await Tour.create(req.body);
    // we will give the data in the request's body from postman now!.
    res.status(201).json({
        status: 'success',
        data: {
            tour: newTour,
        },
    });
});

exports.updateTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!tour) {
        return next(new AppError(`Could not found tour with id: ${id}!`, 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            updatedTour: tour,
        },
    });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    if (!tour) {
        return next(new AppError(`Could not found tour with id: ${id}!`, 404));
    }
    res.status(200).json({
        status: 'success',
        message: 'Tour deleted!',
    });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: {
                ratingsAverage: { $gte: 4.5 },
            },
        },
        {
            $group: {
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 }, //it will sum 1 each time to the numTours counter.
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                maxPrice: { $max: '$price' },
                minPrice: { $min: '$price' },
            },
        },
        {
            $sort: { avgPrice: -1 },
        },
        {
            $match: { _id: { $ne: 'EASY' } },
        },
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            stats,
        },
    });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;

    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates',
        },
        {
            $match: {
                startDates: {
                    //for getting range of tours in a year.
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`),
                },
            },
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numToursStarts: { $sum: 1 },
                tours: {
                    $push: '$name', //for pushing in array
                },
            },
        },
        {
            $addFields: {
                month: '$_id',
            },
        },
        {
            $project: {
                _id: 0,
            },
        },
        {
            $sort: { numToursStarts: -1 },
        },
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            plan,
        },
    });
});
