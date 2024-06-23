const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const AppError = require('../utils/appError');

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el)) {
            newObj[el] = obj[el];
        }
    });
    return newObj;
};

exports.getAllUsers = catchAsync(async (req, res) => {
    const users = await User.find();

    res.status(200).json({
        status: 'success',
        requestedAt: req.requestTime,
        results: users.length,
        data: {
            users: users,
        },
    });
});

exports.createUser = (req, res, next) => {
    res.status(500).json({
        status: 'error',
        message: 'Route not yet implemented',
    });
};

exports.updateMe = catchAsync(async (req, res, next) => {
    //1.) Create Error if posts password!
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for updating password! use (/updatePassword)',
                400,
            ),
        );
    }
    //2.) Filter out unwanted fieldnames that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');

    //3.) Update the User data
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        },
    );

    res.status(200).json({
        status: 'success',
        message: 'User updated..',
        data: {
            updatedUser,
        },
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user._id, { active: false });

    res.status(200).json({
        status: 'success',
        message: 'Your account has been deactivated!',
    });
});

exports.getUserById = catchAsync(async (req, res, next) => {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) {
        return next(new AppError('Invalid User ID! ' + id, 400));
    }
    res.status(200).json({
        status: 'sucess',
        data: {
            user,
        },
    });
});

exports.updateUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'Route not yet implemented',
    });
};

exports.deleteUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'Route not yet implemented',
    });
};
