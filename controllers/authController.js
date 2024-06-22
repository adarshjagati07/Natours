const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY,
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        passwordChangedAt: req.body.passwordChangedAt,
    });

    const token = signToken(newUser._id);

    res.status(201).json({
        status: 'success',
        token,
        data: {
            user: newUser,
        },
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(
            new AppError(
                'Please provide the credentials! (email/password)',
                400,
            ),
        );
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect Email/Password!', 401));
    }

    //if everthing goes okay then send token to the client
    const token = signToken(user._id);
    res.status(200).json({
        status: 'success',
        token,
    });
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;
    //1.) Getting token and check if it's there
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(
            new AppError('You are not logged in! Please login first.'),
            401,
        );
    }

    //2.) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //3.) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('Token to this user does not exists!', 401));
    }
    //4.) Check if user changed password after the token was issued.
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError('User recently changed password, Please login again!'),
            401,
        );
    }

    //Grant access to the protected route.
    req.user = currentUser;
    next();
});

//we will create a wrapper function which will then return the middleware
//function that we want to create
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perform this action!',
                    403,
                ),
            );
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1.)Get user based on Posted email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(
            new AppError('User does not exists with this email address!', 404),
        );
    }

    //2.) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    //3.) Send it to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    const message = `Forgot your password? Submit a patch request with your new password and passwordConfirm on ${resetURL}.\nIf you didn't forget your password then ignore this mail`;
    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token will expire in 10min',
            message,
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!',
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(
            new AppError('Error while sending email!, Please try later!'),
            500,
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    //1.) Get user based on the token
    const token = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    //2.) If token has not expired, and there is the user, set new Password
    if (!user) {
        return next(new AppError('Token is invalid or expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    //3.) Update changedPasswordAt property for the user
    //done this using the document middleware

    //4.) Log the user in, send JWT
    const jwtToken = signToken(user._id);
    res.status(200).json({
        status: 'success',
        jwtToken,
    });
});
