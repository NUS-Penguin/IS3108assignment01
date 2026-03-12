/**
 * models/Hall.js - Cinema Hall Model
 * 
 * Mongoose schema for cinema halls where movies are screened.
 * Includes seat configuration and maintenance status.
 */

const mongoose = require('mongoose');

const seatTypeSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['standard', 'premium', 'vip', 'wheelchair'],
        default: 'standard'
    },
    count: {
        type: Number,
        required: true,
        min: [0, 'Seat count cannot be negative']
    }
}, { _id: false });

const hallSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Hall name is required'],
        unique: true,
        trim: true,
        minlength: [2, 'Hall name must be at least 2 characters'],
        maxlength: [50, 'Hall name cannot exceed 50 characters']
    },
    rows: {
        type: Number,
        required: [true, 'Number of rows is required'],
        min: [1, 'Must have at least 1 row'],
        max: [26, 'Cannot exceed 26 rows (A-Z)']
    },
    columns: {
        type: Number,
        required: [true, 'Number of columns is required'],
        min: [1, 'Must have at least 1 column'],
        max: [50, 'Cannot exceed 50 columns']
    },
    seatTypes: {
        type: [seatTypeSchema],
        default: []
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'maintenance'],
            message: 'Status must be either active or maintenance'
        },
        default: 'active'
    }
}, {
    timestamps: true
});

// Virtual for total seats
hallSchema.virtual('totalSeats').get(function () {
    return this.rows * this.columns;
});

// Instance method to check if hall is available for screening
hallSchema.methods.isAvailable = function () {
    return this.status === 'active';
};

// Static method to find active halls
hallSchema.statics.findActive = function () {
    return this.find({ status: 'active' });
};

// Pre-remove hook to check for future screenings
hallSchema.pre('remove', async function (next) {
    const Screening = mongoose.model('Screening');
    const futureScreenings = await Screening.countDocuments({
        hall: this._id,
        startTime: { $gt: new Date() }
    });

    if (futureScreenings > 0) {
        throw new Error('Cannot delete hall with future screenings scheduled');
    }
    next();
});

module.exports = mongoose.model('Hall', hallSchema);
