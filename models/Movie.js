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
    },
    posterPath: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        required: [true, 'Movie status is required'],
        enum: {
            values: ['Now Showing', 'Coming Soon', 'Archived'],
            message: 'Status must be Now Showing, Coming Soon, or Archived'
        },
        default: 'Now Showing'
    }
}, {
    timestamps: true
});

movieSchema.virtual('durationFormatted').get(function () {
    const hours = Math.floor(this.durationMinutes / 60);
    const minutes = this.durationMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

movieSchema.methods.getFutureScreeningsCount = async function () {
    const Screening = mongoose.model('Screening');
    return Screening.countDocuments({
        movie: this._id,
        startTime: { $gt: new Date() }
    });
};

movieSchema.statics.search = function ({ search, genre, status, releaseYear } = {}) {
    const query = {};

    if (search) {
        query.title = { $regex: search, $options: 'i' };
    }
    if (genre) {
        query.genre = genre;
    }
    if (status) {
        query.status = status;
    }
    if (releaseYear) {
        const year = parseInt(releaseYear);
        query.releaseDate = {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
        };
    }

    return this.find(query).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Movie', movieSchema);
