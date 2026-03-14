const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required']
    },
    role: {
        type: String,
        enum: {
            values: ['admin', 'manager'],
            message: 'Role must be either admin or manager'
        },
        default: 'manager'
    },
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    accountLocked: {
        type: Boolean,
        default: false
    },
    lockUntil: {
        type: Date,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    passwordHistory: [{
        type: String,
        required: false
    }],
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) {
        return next();
    }

    try {
        if (!this.isNew && this.passwordHash) {
            if (!this.passwordHistory) {
                this.passwordHistory = [];
            }
            this.passwordHistory.unshift(this.passwordHash);
            if (this.passwordHistory.length > 5) {
                this.passwordHistory = this.passwordHistory.slice(0, 5);
            }
        }

        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.verifyPassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.isPasswordReused = async function (candidatePassword) {
    if (!this.passwordHistory || this.passwordHistory.length === 0) {
        return false;
    }

    for (const oldPasswordHash of this.passwordHistory) {
        const isMatch = await bcrypt.compare(candidatePassword, oldPasswordHash);
        if (isMatch) {
            return true;
        }
    }
    return false;
};

userSchema.methods.incrementLoginAttempts = async function () {
    if (this.lockUntil && this.lockUntil > Date.now()) {
        return;
    }

    const updates = {
        $inc: { failedLoginAttempts: 1 }
    };

    const isLocking = this.failedLoginAttempts + 1 >= 5;
    if (isLocking) {
        updates.$set = {
            accountLocked: true,
            lockUntil: new Date(Date.now() + 30 * 60 * 1000)
        };
    }

    return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
    return this.updateOne({
        $set: {
            failedLoginAttempts: 0,
            accountLocked: false,
            lockUntil: null
        }
    });
};

userSchema.methods.isLocked = function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    return this.save();
};

userSchema.methods.createPasswordResetToken = function () {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.model('User', userSchema);
