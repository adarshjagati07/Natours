const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'User must have its name!'],
    },
    email: {
        type: String,
        required: [true, 'User must have email!'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email!'],
    },
    photo: {
        type: String,
    },
    password: {
        type: String,
        required: [true, 'User must provide a password'],
        minLength: 8,
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'User must confirm password'],
        minLength: 8,
        validate: {
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords do not match!',
        },
    },
    passwordChangedAt: {
        type: Date,
    },
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    //now we'll the password
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined; //deleted the confirm password
    next();
});

userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword,
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10,
        );
        return JWTTimeStamp < changedTimestamp;
    }
    return false; //means not changed
};

const User = mongoose.model('User', userSchema);

module.exports = User;
