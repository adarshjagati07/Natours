const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
    //by this we transformed wierd error from mongoose to operational.
    const message = `Invalid ${err.path}: ${err.value}!`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    const message = `Duplicate field value: ${err.keyValue.name}. Please use another value`;
    return new AppError(message, 400);
};

const handleValidateFieldsDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);

    const message = `Invalid input data! ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () => {
    const message = 'Invalid token, Please log in again!';
    return new AppError(message, 401);
};

const handleJWTExpiredError = () => {
    const message = 'Token expired, Please login again!';
    return new AppError(message, 401);
};
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack,
    });
};

const sendErrorProd = (err, res) => {
    //Operational error, send message to client,
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
        //Programming or any unknown error!
    } else {
        // 1.) log error
        console.error('Error 💥', err);
        //2.) return generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong!',
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        //this can be mongoose error! which is to be made operational
        if (err.name === 'CastError') error = handleCastErrorDB(error);
        if (err.code === 11000) error = handleDuplicateFieldsDB(error);
        if (err.name === 'ValidationError')
            error = handleValidateFieldsDB(error);
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
        sendErrorProd(error, res);
    }
};
