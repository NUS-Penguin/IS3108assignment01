/**
 * models/Screening.js - Screening Model
 * 
 * Mongoose schema for movie screenings.
 * Includes automatic endTime calculation and date extraction.
 */

const mongoose = require('mongoose');

const seatOccupancyCellSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['regular', 'vip', 'wheelchair', 'unavailable', 'empty'],
        default: 'regular'
    },
    status: {
        type: String,
        enum: ['available', 'occupied', 'unavailable'],
        default: 'available'
    }
}, { _id: false });

const screeningSchema = new mongoose.Schema({
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: [true, 'Movie is required']
    },
    hall: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hall',
        required: [true, 'Hall is required']
    },
    startTime: {
        type: Date,
        required: [true, 'Start time is required']
    },
    endTime: {
        type: Date,
        required: [true, 'End time is required']
    },
    date: {
        type: Date,
        required: [true, 'Date is required']
    },
    status: {
        type: String,
        enum: {
            values: ['Scheduled', 'Cancelled', 'Completed'],
            message: 'Status must be Scheduled, Cancelled, or Completed'
        },
        default: 'Scheduled'
    },
    seatOccupancy: {
        type: [[seatOccupancyCellSchema]],
        default: []
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
screeningSchema.index({ hall: 1, date: 1 });
screeningSchema.index({ startTime: 1 });
screeningSchema.index({ movie: 1 });

// Pre-validate hook to calculate endTime and extract date
// (required fields must be set before validation)
screeningSchema.pre('validate', async function (next) {
    try {
        if (this.isModified('startTime') || this.isModified('movie') || this.isNew) {
            const screeningDate = new Date(this.startTime);
            screeningDate.setHours(0, 0, 0, 0);
            this.date = screeningDate;

            const Movie = mongoose.model('Movie');
            const movie = await Movie.findById(this.movie).select('durationMinutes');

            if (!movie) {
                return next(new Error('Movie not found for screening time calculation'));
            }

            this.endTime = new Date(this.startTime.getTime() + movie.durationMinutes * 60000);
        }

        if (this.status === 'Scheduled' && this.endTime < new Date()) {
            this.status = 'Completed';
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Virtual for formatted date and time
screeningSchema.virtual('startTimeFormatted').get(function () {
    return this.startTime.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Static method to find upcoming screenings
screeningSchema.statics.findUpcoming = function (limit = 10) {
    return this.find({ startTime: { $gt: new Date() }, status: 'Scheduled' })
        .sort({ startTime: 1 })
        .limit(limit)
        .populate('movie', 'title durationMinutes genre')
        .populate('hall', 'name');
};

// Static method to find screenings by date
screeningSchema.statics.findByDate = function (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return this.find({
        status: { $ne: 'Cancelled' },
        startTime: { $gte: dayStart, $lte: dayEnd }
    })
        .populate('movie', 'title durationMinutes')
        .populate('hall', 'name')
        .sort({ startTime: 1 });
};

module.exports = mongoose.model('Screening', screeningSchema);
