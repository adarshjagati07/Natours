const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

//these are factory functions which will return functions
exports.deleteOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndDelete(req.params.id);
        if (!doc) {
            return next(new AppError(`No document found with that ID!`, 404));
        }
        res.status(200).json({
            status: 'success',
            message: 'Document deleted!',
        });
    });

exports.updateOne = (Model) =>
    catchAsync(async (req, res, next) => {
        const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!doc) {
            return next(
                new AppError(`Could not found document with id: ${id}!`, 404),
            );
        }

        res.status(200).json({
            status: 'success',
            data: {
                updatedDoc: doc,
            },
        });
    });

exports.createOne = (Model) =>
    catchAsync(async (req, res, next) => {
        // const newTour = new Tour({});
        // newTour.save();

        const doc = await Model.create(req.body);
        // we will give the data in the request's body from postman now!.
        res.status(201).json({
            status: 'success',
            data: {
                data: doc,
            },
        });
    });

exports.getOne = (Model, populateOptions) =>
    catchAsync(async (req, res, next) => {
        const id = req.params.id;
        let query = await Model.findById(id);
        if (populateOptions) query = query.populate(populateOptions);
        const doc = await query;

        if (!doc) {
            return next(
                new AppError(`Could not found document with id: ${id}!`, 404),
            );
        }

        res.status(200).json({
            status: 'success',
            data: {
                data: doc,
            },
        });
    });

exports.getAll = (Model) =>
    catchAsync(async (req, res, next) => {
        //to allow nested GET reviews on tour
        let filter = {};
        if (req.params.tourId) filter = { tour: req.params.tourId };

        // EXECUTE QUERY
        const features = new APIFeatures(Model.find(filter), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();
        const doc = await features.query;

        // SEND RESPONSE
        res.status(200).json({
            status: 'success',
            requestedAt: req.requestTime,
            results: doc.length,
            data: {
                data: doc,
            },
        });
    });
