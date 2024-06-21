const mongoose = require('mongoose');
const dotenv = require('dotenv');

//Handling uncaught exception
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION!💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE;
mongoose.connect(DB).then((con) => {
    console.log('Database Connected..');
});

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
    console.log(`Server is listening on port : ${port}`);
});

//Handling unhandled promise rejection
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED PROMISE REJECTION!💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
