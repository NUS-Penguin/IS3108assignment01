/**
 * models/User.js - User Model
 * 
 * Mongoose schema for admin users with authentication support.
 * Handles password hashing and verification.
 */

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

// Pre-save hook to hash password and manage password history
userSchema.pre('save', async function (next) {
    // Only hash password if it has been modified (or is new)
    if (!this.isModified('passwordHash')) {
        return next();
    }

    try {
        // Store old password in history (if this is a password change, not initial creation)
        if (!this.isNew && this.passwordHash) {
            // Keep last 5 passwords in history
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

// Instance method to verify password
userSchema.methods.verifyPassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to check if password was used recently
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

// Instance method to increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function () {
    // If account is already locked and lock hasn't expired
    if (this.lockUntil && this.lockUntil > Date.now()) {
        return;
    }

    // Reset if lock has expired
    const updates = {
        $inc: { failedLoginAttempts: 1 }
    };

    // Lock account after 5 failed attempts (lock for 30 minutes)
    const isLocking = this.failedLoginAttempts + 1 >= 5;
    if (isLocking) {
        updates.$set = {
            accountLocked: true,
            lockUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        };
    }

    return await this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
    return await this.updateOne({
        $set: {
            failedLoginAttempts: 0,
            accountLocked: false,
            lockUntil: null
        }
    });
};

// Instance method to check if account is locked
userSchema.methods.isLocked = function () {
    // Check if lockUntil exists and is in the future
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    return await this.save();
};

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    return resetToken;
};

// Static method to find active users
userSchema.statics.findByUsername = function (username) {
    return this.findOne({ username });
};

module.exports = mongoose.model('User', userSchema);
