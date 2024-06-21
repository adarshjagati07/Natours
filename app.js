const express = require('express');
const fs = require('fs');
const morgan = require('morgan');
const userRouter = require('./routes/userRoutes');
const tourRouter = require('./routes/tourRoutes');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();
//reading the data from file itself, later we'll take this from database.

//1.)MIDDLEWARES
app.use(express.json()); // to get the express body.
app.use(express.static(`${__dirname}/public`));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
//by this express knows we are defining middleware over here.
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString(); //we dynamically added requestTime to our request
    next();
});

//HANDLING ROUTERS
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

//ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;
