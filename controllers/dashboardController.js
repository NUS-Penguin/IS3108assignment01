const Movie = require('../models/Movie');
const Hall = require('../models/Hall');
const Screening = require('../models/Screening');
const User = require('../models/User');

exports.index = async (req, res, next) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const user = await User.findById(req.session.userId).select('username email role lastLogin');

        const [activeMovies, activeHalls, screeningsToday, upcomingScreenings] = await Promise.all([
            Movie.countDocuments(),
            Hall.countDocuments({ status: 'active' }),
            Screening.countDocuments({
                date: {
                    $gte: todayStart,
                    $lte: todayEnd
                }
            }),
            Screening.find({
                startTime: { $gt: now },
                status: 'Scheduled'
            })
                .populate('movie', 'title durationMinutes genre posterURL posterPath description')
                .populate('hall', 'name')
                .sort({ startTime: 1 })
                .limit(10)
        ]);

        res.render('dashboard/index', {
            title: 'Dashboard',
            username: req.session.username,
            user: {
                username: user.username,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin
            },
            stats: {
                activeMovies,
                activeHalls,
                screeningsToday
            },
            upcomingScreenings
        });

    } catch (error) {
        next(error);
    }
};

exports.renderSettings = (req, res) => {
    res.render('admin/settings', {
        title: 'Settings'
    });
};
