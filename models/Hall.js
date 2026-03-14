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
        max: [25, 'Cannot exceed 25 rows (A-Y)']
    },
    columns: {
        type: Number,
        required: [true, 'Number of columns is required'],
        min: [1, 'Must have at least 1 column'],
        max: [25, 'Cannot exceed 25 columns']
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
                if (seats && seats.length > 0) {
                    if (seats.length !== this.rows) return false;

                    for (let row of seats) {
                        if (row.length !== this.columns) return false;

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

hallSchema.virtual('capacity').get(function () {
    return this.rows * this.columns;
});

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

hallSchema.methods.generateSeatingLayout = function () {
    const layout = [];
    let seatIndex = 0;

    const seatMap = [];
    if (this.seatTypes && this.seatTypes.length > 0) {
        this.seatTypes.forEach(seatType => {
            for (let i = 0; i < seatType.count; i++) {
                seatMap.push(seatType.type);
            }
        });
    }

    while (seatMap.length < this.capacity) {
        seatMap.push('regular');
    }

    for (let row = 0; row < this.rows; row++) {
        const rowLabel = String.fromCharCode(65 + row);
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

hallSchema.methods._getSeatLabel = function (seatType) {
    const labels = {
        'regular': 'O',
        'vip': 'V',
        'wheelchair': 'W'
    };
    return labels[seatType] || 'O';
};

hallSchema.methods.getStatusBadgeClass = function () {
    const badgeMap = {
        'active': 'bg-success',
        'maintenance': 'bg-danger',
        'cleaning': 'bg-warning text-dark'
    };
    return badgeMap[this.status] || 'bg-secondary';
};

hallSchema.pre('save', function (next) {
    if (this.status === 'maintenance') {
        if (this.maintenanceStartDate && this.maintenanceEndDate) {
            if (this.maintenanceStartDate >= this.maintenanceEndDate) {
                return next(new Error('Maintenance end date must be after start date'));
            }
        }
    }

    if (this.status !== 'maintenance') {
        this.maintenanceStartDate = null;
        this.maintenanceEndDate = null;
        this.maintenanceReason = null;
    }

    next();
});

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

hallSchema.set('toJSON', { virtuals: true });
hallSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Hall', hallSchema);
