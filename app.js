const express = require('express');
const morgan = require('morgan');
const userRouter = require('./routes/userRoutes');
const tourRouter = require('./routes/tourRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();
//reading the data from file itself, later we'll take this from database.

//1.) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Body parser, now it will limit the size of body to only 10kb
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against cross site scripting attacks(XSS)
app.use(xss());

// Prevent HTTP parameter pollution
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'maxGroupSize',
            'difficulty',
            'price',
        ],
    }),
);

// Serving static files
app.use(express.static(`${__dirname}/public`));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

//by this express knows we are defining middleware over here.
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString(); //we dynamically added requestTime to our request
    next();
});

// Limit requests from same api
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000, //1hr
    message: 'Too many requests! Please try again after an hour.',
});
app.use('/api', limiter);

// HANDLING ROUTERS
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);

app.all('*', (req, res, next) => {
    //our own error handler class (AppError)
    const err = new AppError(
        `Cannot find ${req.originalUrl} in this server!`,
        404,
    );

    next(err); // this will trigger the error handling middleware
});

// ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
