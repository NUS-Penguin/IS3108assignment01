/**
 * models/Hall.js - Cinema Hall Model
 * 
 * Mongoose schema for cinema halls where movies are screened.
 * Includes seat configuration, maintenance scheduling, and seating layout.
 * Enhanced for Module 2: Hall Management
 */

const mongoose = require('mongoose');

const seatTypeSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['regular', 'vip', 'wheelchair'],
        default: 'regular'
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
    seats: {
        type: [[String]],
        default: [],
        validate: {
            validator: function (seats) {
                // If seats array is provided, validate structure
                if (seats && seats.length > 0) {
                    // Check if seats matrix matches rows and columns
                    if (seats.length !== this.rows) return false;

                    for (let row of seats) {
                        if (row.length !== this.columns) return false;

                        // Validate each seat type
                        for (let seat of row) {
                            if (!['regular', 'vip', 'wheelchair', 'unavailable', 'empty'].includes(seat)) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            },
            message: 'Seats matrix must match hall dimensions and contain valid seat types'
        }
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'maintenance', 'cleaning'],
            message: 'Status must be active, maintenance, or cleaning'
        },
        default: 'active'
    },
    maintenanceStartDate: {
        type: Date,
        default: null
    },
    maintenanceEndDate: {
        type: Date,
        default: null
    },
    maintenanceReason: {
        type: String,
        trim: true,
        maxlength: [200, 'Maintenance reason cannot exceed 200 characters'],
        default: null
    }
}, {
    timestamps: true
});

// Virtual for automatic capacity calculation: rows × columns
hallSchema.virtual('capacity').get(function () {
    return this.rows * this.columns;
});

// Virtual for backward compatibility
hallSchema.virtual('totalSeats').get(function () {
    return this.capacity;
});

// Virtual for checking if hall is under maintenance
hallSchema.virtual('isUnderMaintenance').get(function () {
    if (this.status !== 'maintenance') return false;
    if (!this.maintenanceEndDate) return true;

    const now = new Date();
    return now <= this.maintenanceEndDate;
});

// Instance method to check if hall is available for screening
hallSchema.methods.isAvailable = function () {
    return this.status === 'active';
};

// Instance method to get seat type distribution
hallSchema.methods.getSeatDistribution = function () {
    if (!this.seatTypes || this.seatTypes.length === 0) {
        return [{
            type: 'regular',
            count: this.capacity,
            percentage: 100
        }];
    }

    return this.seatTypes.map(seat => ({
        type: seat.type,
        count: seat.count,
        percentage: Math.round((seat.count / this.capacity) * 100)
    }));
};

// Instance method to generate seating layout preview
hallSchema.methods.generateSeatingLayout = function () {
    const layout = [];
    let seatIndex = 0;

    // Create seat type map based on distribution
    const seatMap = [];
    if (this.seatTypes && this.seatTypes.length > 0) {
        this.seatTypes.forEach(seatType => {
            for (let i = 0; i < seatType.count; i++) {
                seatMap.push(seatType.type);
            }
        });
    }

    // Fill remaining seats with regular if seat types don't match capacity
    while (seatMap.length < this.capacity) {
        seatMap.push('regular');
    }

    // Generate rows
    for (let row = 0; row < this.rows; row++) {
        const rowLabel = String.fromCharCode(65 + row); // A, B, C, etc.
        const seats = [];

        for (let col = 0; col < this.columns; col++) {
            const seatType = seatMap[seatIndex] || 'regular';
            seats.push({
                row: rowLabel,
                column: col + 1,
                type: seatType,
                label: this._getSeatLabel(seatType)
            });
            seatIndex++;
        }

        layout.push({
            rowLabel,
            seats
        });
    }

    return layout;
};

// Private helper method to get seat label for display
hallSchema.methods._getSeatLabel = function (seatType) {
    const labels = {
        'regular': 'O',
        'vip': 'V',
        'wheelchair': 'W'
    };
    return labels[seatType] || 'O';
};

// Instance method to get status badge class
hallSchema.methods.getStatusBadgeClass = function () {
    const badgeMap = {
        'active': 'bg-success',
        'maintenance': 'bg-danger',
        'cleaning': 'bg-warning text-dark'
    };
    return badgeMap[this.status] || 'bg-secondary';
};

// Instance method to get formatted maintenance period
hallSchema.methods.getMaintenancePeriod = function () {
    if (!this.maintenanceStartDate || !this.maintenanceEndDate) {
        return null;
    }

    const options = { month: 'short', day: 'numeric' };
    const start = this.maintenanceStartDate.toLocaleDateString('en-US', options);
    const end = this.maintenanceEndDate.toLocaleDateString('en-US', options);

    return `${start} – ${end}`;
};

// Static method to find active halls
hallSchema.statics.findActive = function () {
    return this.find({ status: 'active' });
};

// Validation: Maintenance dates must be valid if status is maintenance
hallSchema.pre('save', function (next) {
    if (this.status === 'maintenance') {
        if (this.maintenanceStartDate && this.maintenanceEndDate) {
            if (this.maintenanceStartDate >= this.maintenanceEndDate) {
                return next(new Error('Maintenance end date must be after start date'));
            }
        }
    }

    // Clear maintenance fields if status is not maintenance
    if (this.status !== 'maintenance') {
        this.maintenanceStartDate = null;
        this.maintenanceEndDate = null;
        this.maintenanceReason = null;
    }

    next();
});

// Validation: Seat types must sum to total capacity
hallSchema.pre('save', function (next) {
    if (this.seatTypes && this.seatTypes.length > 0) {
        const totalSeats = this.seatTypes.reduce((sum, seat) => sum + seat.count, 0);
        const capacity = this.rows * this.columns;

        if (totalSeats > capacity) {
            return next(new Error('Total seat types cannot exceed hall capacity'));
        }
    }

    next();
});

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

// Ensure virtuals are included in JSON and Object outputs
hallSchema.set('toJSON', { virtuals: true });
hallSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Hall', hallSchema);
