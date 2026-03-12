/**
 * models/Movie.js - Movie Model
 * 
 * Mongoose schema for movies available for screening.
 * Includes movie details and validation rules.
 */

const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Movie title is required'],
        trim: true,
        minlength: [1, 'Title must be at least 1 character'],
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Movie description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    durationMinutes: {
        type: Number,
        required: [true, 'Movie duration is required'],
        min: [1, 'Duration must be at least 1 minute'],
        max: [500, 'Duration cannot exceed 500 minutes']
    },
    genre: {
        type: String,
        required: [true, 'Genre is required'],
        enum: {
            values: ['Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary', 'Animation', 'Fantasy'],
            message: 'Please select a valid genre'
        }
    },
    releaseDate: {
        type: Date,
        required: [true, 'Release date is required']
    },
    posterURL: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, 'Please provide a valid URL'],
        default: null
    }
}, {
    timestamps: true
});

// Virtual for duration in hours and minutes
movieSchema.virtual('durationFormatted').get(function () {
    const hours = Math.floor(this.durationMinutes / 60);
    const minutes = this.durationMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

// Instance method to check if movie has future screenings
movieSchema.methods.hasFutureScreenings = async function () {
    const Screening = mongoose.model('Screening');
    const count = await Screening.countDocuments({
        movie: this._id,
        startTime: { $gt: new Date() }
    });
    return count > 0;
};

// Static method to find movies by genre
movieSchema.statics.findByGenre = function (genre) {
    return this.find({ genre });
};

// Pre-remove hook to prevent deletion if future screenings exist
movieSchema.pre('remove', async function (next) {
    const hasFuture = await this.hasFutureScreenings();
    if (hasFuture) {
        throw new Error('Cannot delete movie with future screenings scheduled');
    }
    next();
});

module.exports = mongoose.model('Movie', movieSchema);
