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

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    const cookieOptions = {
        expires: new Date(
            Date.now() +
                process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
        ),
        httpOnly: true,
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    res.cookie('jwt', token, cookieOptions);

    user.password = undefined; //to remove it from showing in output
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
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
    createSendToken(newUser, 201, res);
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
    createSendToken(user, 200, res);
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
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //1.) Get user from the collection
    const currentUser = await User.findById(req.user.id).select('+password');
    console.log(currentUser);

    //2.) Check if the current password is correct
    const currentPassword = req.body.currentPassword;
    if (
        !(await currentUser.correctPassword(
            currentPassword,
            currentUser.password,
        ))
    ) {
        return next(new AppError('Incorrect Password!', 403));
    }
    //3.) If so, update password
    currentUser.password = req.body.password;
    currentUser.passwordConfirm = req.body.passwordConfirm;
    await currentUser.save();

    //4.) Log in user, send JWT
    createSendToken(currentUser, 200, res);
});
