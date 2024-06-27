const mongoose = require('mongoose');
const fs = require('fs');
const Tour = require('./../../models/tourModel');
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE;

mongoose.connect(DB).then((con) => {
    console.log('Database Connected..');
});

//read jsonfile
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const reviews = JSON.parse(
    fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'),
);
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));

//import data to database.
const importData = async () => {
    try {
        await Tour.create(tours); //it can also accept array of objects.
        await User.create(users, { validateBeforeSave: false });
        await Review.create(reviews);
        console.log('Data successfully added..');
        process.exit();
    } catch (err) {
        console.log(err);
    }
};

// delete all data from collection.
const deleteData = async () => {
    try {
        await Tour.deleteMany();
        await User.deleteMany();
        await Review.deleteMany();
        console.log('Data Successfully deleted');
        process.exit();
    } catch (err) {
        console.log(err);
    }
};

if (process.argv[2] === '--import') {
    importData();
} else if (process.argv[2] === '--delete') {
    deleteData();
}
