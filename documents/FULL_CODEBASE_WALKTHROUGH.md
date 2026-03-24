# CineVillage Admin Portal: Complete Technical Learning Walkthrough

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Design & Models](#3-database-design--models)
4. [Authentication System](#4-authentication-system)
5. [Session Management](#5-session-management)
6. [Middleware Architecture](#6-middleware-architecture)
7. [Routing & Request Handling](#7-routing--request-handling)
8. [Service Layer Architecture](#8-service-layer-architecture)
9. [Frontend: Layout & Templating](#9-frontend-layout--templating)
10. [Screening Scheduler UI](#10-screening-scheduler-ui)
11. [File Upload & Image Processing](#11-file-upload--image-processing)
12. [Error Handling & Validation](#12-error-handling--validation)
13. [Data Persistence & Transactions](#13-data-persistence--transactions)
14. [Client-Side Interactivity & State Management](#14-client-side-interactivity--state-management)

---

## 1. Architecture Overview

### Application Structure

CineVillage is a **three-tier web application**:

```
Presentation Layer (EJS Templates + Bootstrap UI)
    ↓
Business Logic Layer (Controllers + Services)
    ↓
Data Access Layer (Mongoose Models + MongoDB)
```

**Key Architectural Patterns:**
- **MVC Model**: Models define data, Views render UI, Controllers orchestrate logic
- **Service Layer Pattern**: Business logic separated from HTTP handling
- **Middleware Chain**: Stackable request/response processing
- **Repository Pattern**: Service classes abstract database operations
- **Singleton Pattern**: Shared database connection through `config/db.js`

### Entry Point: app.js

The `app.js` file bootstraps the entire application:

```javascript
// 1. Import dependencies
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// 2. Create Express app
const app = express();

// 3. Configure view engine (EJS + Layouts)
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 4. Register middleware (order matters!)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(session({...}));

// 5. Mount routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/halls', hallRoutes);
app.use('/admin/movies', movieRoutes);
app.use('/admin/screenings', screeningRoutes);

// 6. Error handler (last middleware)
app.use(errorHandler);

// 7. Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT);
```

**Middleware Execution Order** (critical for understanding request flow):
1. Body parsers (`express.json`, `express.urlencoded`)
2. Method override (converts POST with `_method=PUT` to PUT)
3. Session middleware (populates `req.session`)
4. Flash middleware (reads/clears flash messages)
5. Auth middleware on protected routes
6. Controller logic
7. Error handler (only if error thrown)

---

## 2. Technology Stack

### Backend

| Component | Package | Purpose |
|-----------|---------|---------|
| **Server** | Express 4.x | HTTP server, routing, middleware |
| **Database** | MongoDB | Document store |
| **ODM** | Mongoose 7.x | Schema validation, hooks, queries |
| **Sessions** | express-session + connect-mongo | Persistent user sessions in MongoDB |
| **Templating** | EJS + express-ejs-layouts | Server-side HTML rendering with layout inheritance |
| **File Upload** | multer | Middleware for poster image uploads |
| **Passwords** | bcrypt | Secure password hashing with salt rounds |
| **Env Config** | dotenv | Environment variable management |
| **HTTP Override** | method-override | Simulate PUT/DELETE from HTML forms |

### Frontend

| Component | Library | Purpose |
|-----------|---------|---------|
| **Framework** | Bootstrap 5 | Responsive grid, components, utilities |
| **Icons** | Bootstrap Icons | SVG icon set |
| **CSS Theme** | Custom Dark Theme | Dark mode with CSS variables |
| **Interactive UI** | Vanilla JavaScript | Event listeners, DOM manipulation, AJAX |
| **Drag-Drop** | Native HTML5 API | Timeline scheduling & movie dragging |
| **HTTP Requests** | Fetch API | Async AJAX calls to backend |

User clicks button
↓
Frontend JS (event listener)
↓
AJAX request (fetch)
↓
Express route
↓
Controller
↓
Database (Model)
↓
Response sent back
↓
Frontend updates DOM

### Development & Runtime

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 14+ | JavaScript runtime |
| **npm** | 6+ | Package manager |
| **.env** | (local) | Database URI, session secret, API config |

---

## 3. Database Design & Models

### MongoDB Connection Flow

**File**: `config/db.js`

```javascript
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ MongoDB connection failed:', error);
        process.exit(1);
    }
};
```

**Connection String Format**: `mongodb://localhost:27017/cinevillage` or MongoDB Atlas URI

### Model: User

**Location**: `models/User.js`

**Purpose**: Stores admin credentials, passwords, session tokens, and lockout state for brute-force protection.

**Schema Fields**:
```javascript
{
  username: String (required, unique, lowercase),
  email: String (required, unique, lowercase),
  passwordHash: String (required, bcrypt hashed),
  role: String (enum: ['admin', 'editor'], default: 'admin'),
  isActive: Boolean (default: true),
  
  // Brute-force protection
  lockoutUntil: Date (null unless locked),
  lockoutAttempts: Number (default: 0),
  
  // Password recovery
  passwordHistory: [String] (last 5 hashed passwords),
  resetToken: String (one-time token for password reset),
  resetTokenExpiry: Date (expires in 1 hour),
  
  // Audit trail
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Pre-Save Hook** (runs before every save):
```javascript
userSchema.pre('save', async function(next) {
  // If password not modified, skip hashing
  if (!this.isModified('password')) return next();
  
  // Hash password with 10 salt rounds
  this.passwordHash = await bcrypt.hash(this.password, 10);
  
  // Rotate password history (keep last 5)
  if (this.passwordHistory && this.passwordHistory.length >= 5) {
    this.passwordHistory.shift();
  }
  this.passwordHistory.push(this.passwordHash);
  
  next();
});
```

**Methods**:
- `comparePassword(password)` → Boolean (compares input password with hashed)
- `isLocked()` → Boolean (checks lockout status)
- `lock(durationMinutes)` → void (applies lockout)

### Model: Hall

**Location**: `models/Hall.js`

**Purpose**: Represents cinema halls with configurable seating layouts and maintenance schedules.

**Schema**:
```javascript
{
  code: String (required, unique, e.g. "HALL_A"),
  name: String (required, e.g. "Hall A - Premium"),
  capacity: Number (computed from seats array),
  
  // 2D seat matrix: [[seatType]]
  // seatType = 'standard' | 'reclined' | 'disabled' | null (aisle/blocked)
  seats: [[String]],  // e.g. [['standard', 'standard', null, 'reclined']]
  
  // Summary of seat types
  seatTypes: {
    standard: Number,
    reclined: Number,
    disabled: Number
  },
  
  // Maintenance scheduling
  maintenanceStart: Date,
  maintenanceEnd: Date,
  maintenanceDescription: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

**Virtual Field** (`capacity`):
```javascript
hallSchema.virtual('capacity').get(function() {
  return this.seats.reduce((total, row) => {
    return total + row.filter(seat => seat !== null).length;
  }, 0);
});
```

**Pre-Validate Hook** (business logic before validation):
```javascript
hallSchema.pre('validate', function(next) {
  // Ensure maintenance dates don't conflict
  // Ensure capacity calculation is sound
  next();
});
```

**Seat Matrix Structure Example**:
```javascript
// 3 rows × 4 columns (one aisle in middle)
seats: [
  ['standard', 'standard', null,  'reclined'],   // Row 1
  ['standard', 'standard', null,  'reclined'],   // Row 2
  ['reclined', 'reclined',  null,  'disabled']   // Row 3
]
```

### Model: Movie

**Location**: `models/Movie.js`

**Purpose**: Stores movie metadata (title, genre, duration) and references future screenings.

**Schema**:
```javascript
{
  title: String (required),
  description: String,
  genre: String (enum: ['Action', 'Comedy', 'Drama', 'Horror', 'Thriller', 'Romance']),
  durationMinutes: Number (required, e.g. 120),
  releaseDate: Date,
  endDate: Date,
  
  status: String (enum: ['upcoming', 'now-showing', 'archived'], default: 'upcoming'),
  
  posterUrl: String (path to uploaded image, e.g. '/uploads/posters/movie_123.jpg'),
  
  // Denormalized count (updated when screening created/deleted)
  futureScreeningsCount: Number (default: 0),
  
  createdAt: Date,
  updatedAt: Date
}
```

**Virtual Field** (`durationFormatted`):
```javascript
movieSchema.virtual('durationFormatted').get(function() {
  return `${Math.floor(this.durationMinutes / 60)}h ${this.durationMinutes % 60}m`;
});
```

**Static Method** (`search`):
```javascript
movieSchema.statics.search = async function(query) {
  const regex = new RegExp(query, 'i'); // case-insensitive
  return this.find({ $or: [
    { title: regex },
    { genre: regex },
    { description: regex }
  ]});
};
```

**Post-Delete Hook**:
```javascript
movieSchema.post('findByIdAndDelete', function(doc) {
  // Cascade: delete all screenings for this movie
  Screening.deleteMany({ movieId: doc._id });
});
```

### Model: Screening

**Location**: `models/Screening.js`

**Purpose**: Represents a scheduled showing of a movie at a specific hall, date, and time, including per-seat occupancy.

**Schema**:
```javascript
{
  movieId: ObjectId (ref: 'Movie', required),
  hallId: ObjectId (ref: 'Hall', required),
  screeningDate: Date (required, normalized to start of day),
  startTime: String (required, format: 'HH:MM', e.g. '14:30'),
  endTime: String (auto-calculated from movie duration),
  
  // Seat occupancy: 2D array mirroring hall.seats structure
  // Each cell tracks occupancy and type for each seat
  seatOccupancy: [[{
    type: String (seat type: 'standard' | 'reclined' | 'disabled'),
    status: String (enum: ['available', 'reserved', 'sold', 'blocked'])
  }]],
  
  totalRevenue: Number (cumulative ticket sales),
  status: String (enum: ['scheduled', 'in-progress', 'completed', 'cancelled']),
  
  createdAt: Date,
  updatedAt: Date
}
```

**Pre-Validate Hook** (applies business rules):
```javascript
screeningSchema.pre('validate', function(next) {
  // 1. Normalize screeningDate to midnight UTC
  this.screeningDate = new Date(this.screeningDate.toISOString().split('T')[0]);
  
  // 2. Calculate endTime = startTime + movie duration
  // 3. Check for hall-level conflicts (no overlapping screenings + buffer)
  
  next();
});
```

**Compound Indexes** (for query performance):
```javascript
screeningSchema.index({ hallId: 1, screeningDate: 1, startTime: 1 });
screeningSchema.index({ movieId: 1, status: 1 });
```

---

## 4. Authentication System

### Authentication Flow

**File**: `controllers/authController.js`

#### 1. **User Registration**

```
POST /auth/register
   ↓ Body validation (username, email, password)
   ↓ Check username/email uniqueness
   ↓ Create User document (password auto-hashed by pre-save hook)
   ↓ Redirect to login
```

**Code walkthrough**:
```javascript
exports.registerUser = async (req, res, next) => {
  try {
    const { username, email, password, passwordConfirm } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).render('auth/register', {
        message: 'All fields are required'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    if (existingUser) {
      return res.status(400).render('auth/register', {
        message: 'Username or email already in use'
      });
    }
    
    // Create user (password hashed automatically in pre-save)
    const user = await User.create({ username, email, password });
    
    res.status(201).redirect('/auth/login');
  } catch (error) {
    next(error);
  }
};
```

#### 2. **User Login (with Brute-Force Protection)**

```
POST /auth/login
   ↓ Retrieve user from DB
   ↓ Check if account is locked
   ↓ Compare passwords (bcrypt.compare)
   ↓ Reset lockout counter on success
   ↓ Create session (express-session middleware)
   ↓ Redirect to dashboard
```

**Lockout rules**:
- After 5 failed attempts → lockout for 15 minutes
- Lockout timestamp stored in `user.lockoutUntil`
- On successful login → `lockoutAttempts = 0`, `lockoutUntil = null`

**Code**:
```javascript
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).render('auth/login', {
        message: 'Invalid username or password'
      });
    }
    
    // Check lockout
    if (user.isLocked()) {
      return res.status(403).render('auth/login', {
        message: 'Account locked. Try again later.'
      });
    }
    
    // Compare passwords
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      user.lockoutAttempts += 1;
      
      // Lock after 5 attempts
      if (user.lockoutAttempts >= 5) {
        user.lock(15); // lock for 15 minutes
      }
      await user.save();
      
      return res.status(401).render('auth/login', {
        message: 'Invalid username or password'
      });
    }
    
    // Success: reset lockout and create session
    user.lockoutAttempts = 0;
    user.lockoutUntil = null;
    await user.save();
    
    req.session.userId = user._id;
    req.session.username = user.username;
    
    res.status(200).redirect('/admin/dashboard');
  } catch (error) {
    next(error);
  }
};
```

#### 3. **Password Recovery (Forgot/Reset)**

```
GET /auth/forgot-password
   ↓ Display email form
   
POST /auth/forgot-password
   ↓ Find user by email
   ↓ Generate random reset token (crypto)
   ↓ Store token hash + expiry (1 hour)
   ↓ Send email with reset link (backend ready, email simulation in logs)
   ↓ Show "Check your email" message
   
GET /auth/reset-password?token=xyz
   ↓ Verify token (check DB, expiry)
   ↓ Display new password form
   
POST /auth/reset-password
   ↓ Verify token validity
   ↓ Hash new password
   ↓ Clear token fields
   ↓ Redirect to login
```

---

## 5. Session Management

### Session Storage

**Configuration** (in `app.js`):

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  
  // Use MongoDB for persistence (survives server restart)
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60  // Auto-delete after 1 day (cleanup in MongoDB)
  }),
  
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,  // 1 day in milliseconds
    httpOnly: true,                 // Inaccessible to client-side JS (prevents XSS)
    secure: process.env.NODE_ENV === 'production',  // Only HTTPS in production
    sameSite: 'strict'              // CSRF protection
  }
}));
```

### Session Data Flow

**1. On Login:**
```javascript
// After password validation
req.session.userId = user._id;
req.session.username = user.username;
// Session object automatically serialized and stored in MongoDB
```

**2. On Each Request:**
```javascript
// express-session middleware automatically:
// 1. Reads session ID from cookie
// 2. Fetches session data from MongoDB
// 3. Populates req.session
// 4. Makes available to controllers and views
```

**3. Flash Messages:**
```javascript
// In middleware (app.js):
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  res.locals.user = req.session.userId ? {
    id: req.session.userId,
    username: req.session.username
  } : null;
  delete req.session.flash;  // Clear after reading
  next();
});

// In controller:
req.session.flash = {
  type: 'success',
  message: 'Hall created successfully'
};
res.redirect('/admin/halls');

// In view (layouts/main.ejs):
<% if (flash && flash.message) { %>
  <div class="alert alert-<%= flash.type %>">
    <%= flash.message %>
  </div>
<% } %>
```

### Session Warning

**File**: `public/js/main.js`

A JavaScript timer warns users before session expires:
```javascript
// Set to trigger at 30-minute mark (configurable)
setInterval(() => {
  // If session > 30 minutes old, show warning modal
  if (sessionExpiresAt < Date.now() + 5 * 60 * 1000) {
    showSessionWarning();
  }
}, 60000);  // Check every minute
```

---

## 6. Middleware Architecture

### Middleware Pipeline

Each request flows through this sequence:

```
1. Express built-in
   ├─ express.json()              → Parse JSON body
   ├─ express.urlencoded()        → Parse form data
   └─ express.static()            → Serve CSS/JS/images

2. Method override
   └─ methodOverride('_method')   → Convert POST+_method to PUT/DELETE

3. Session
   └─ session middleware          → Load req.session from MongoDB

4. Flash & User injection
   └─ Custom middleware           → Set res.locals.flash, res.locals.user

5. Route handlers
   └─ Controllers (auth, admin, halls, movies, screenings)

6. Error handler
   └─ errorHandler middleware     → Catch and format errors
```

### Custom Middleware Files

#### `middleware/authMiddleware.js`

**Purpose**: Protect routes from unauthenticated access.

```javascript
exports.requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).redirect('/auth/login');
  }
  // Attach user to request object for use in controllers
  req.user = { id: req.session.userId };
  next();
};
```

**Usage in routes**:
```javascript
router.get('/dashboard', requireLogin, (req, res) => {
  // Only executes if user is logged in
});
```

#### `middleware/errorMiddleware.js`

**Purpose**: Centralized error handling and formatting.

```javascript
exports.errorHandler = (err, req, res, next) => {
  // Set default error properties
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal server error';
  
  // Handle specific Mongoose errors
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.message = Object.values(err.errors)
      .map(e => e.message)
      .join(', ');
  }
  
  if (err.name === 'MongoServerError' && err.code === 11000) {
    // Duplicate key
    err.statusCode = 400;
    err.message = `Duplicate value for ${Object.keys(err.keyPattern)[0]}`;
  }
  
  // Render error page
  res.status(err.statusCode).render('error', {
    message: err.message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};
```

#### `middleware/uploadMiddleware.js`

**Purpose**: Configure multer for poster image uploads.

```javascript
const multer = require('multer');
const path = require('path');

// Define storage location and filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/posters');
  },
  filename: (req, file, cb) => {
    // Sanitize filename: movie_1234_timestamp.jpg
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    cb(null, 'movie_' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter: only images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed'), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB limit
});
```

#### `middleware/validationMiddleware.js`

**Purpose**: Input validation helpers.

```javascript
exports.validateHallForm = (req, res, next) => {
  const { code, name, capacity } = req.body;
  
  if (!code || !name || !capacity) {
    return res.status(400).render('halls/create', {
      message: 'All fields required'
    });
  }
  
  if (capacity < 10 || capacity > 1000) {
    return res.status(400).render('halls/create', {
      message: 'Capacity must be between 10 and 1000'
    });
  }
  
  next();
};
```

---

## 7. Routing & Request Handling

### Route Mounting Hierarchy

```
app.js (main)
├─ /auth → authRoutes.js
│  ├─ GET  /login           → render login form
│  ├─ POST /login           → authController.login
│  ├─ GET  /register        → render register form
│  ├─ POST /register        → authController.registerUser
│  ├─ GET  /forgot-password → render forgot form
│  ├─ POST /forgot-password → authController.forgotPassword
│  ├─ GET  /reset-password  → render reset form
│  └─ POST /reset-password  → authController.resetPassword
│
├─ /admin → adminRoutes.js (requireLogin)
│  ├─ GET / → dashboardController.index
│  └─ GET /settings → render settings page
│
├─ /admin/halls → hallRoutes.js (requireLogin)
│  ├─ GET  /           → hallController.getAllHalls
│  ├─ GET  /new        → render create form
│  ├─ POST /           → hallController.createHall
│  ├─ GET  /:id        → hallController.getHallById
│  ├─ GET  /:id/edit   → render edit form
│  ├─ PUT  /:id        → hallController.updateHall
│  └─ DELETE /:id      → hallController.deleteHall
│
├─ /admin/movies → movieRoutes.js (requireLogin)
│  ├─ GET  /           → movieController.getAllMovies
│  ├─ GET  /new        → render create form
│  ├─ POST /           → uploadMiddleware, movieController.createMovie
│  ├─ GET  /:id        → movieController.getMovieById
│  ├─ GET  /:id/edit   → render edit form
│  ├─ PUT  /:id        → uploadMiddleware, movieController.updateMovie
│  └─ DELETE /:id      → movieController.deleteMovie
│
└─ /admin/screenings → screeningRoutes.js (requireLogin)
   ├─ GET  /           → screeningController.index
   ├─ GET  /new        → render create form
   ├─ POST /           → screeningController.createScreening
   ├─ GET  /:id        → screeningController.getScreening
   ├─ PATCH /:id/move  → screeningController.moveScreening (AJAX)
   ├─ PATCH /:id/seat  → screeningController.markSeatOccupancy (AJAX)
   └─ DELETE /:id      → screeningController.deleteScreening
```

### Route File: screeningRoutes.js

```javascript
const express = require('express');
const {
  index,
  createScreening,
  moveScreening,
  cancelScreening
} = require('../controllers/screeningController');
const { requireLogin } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected route: require login
router.use(requireLogin);

// Timeline/scheduler view with movie library
router.get('/', index);

// Create screening via form OR AJAX
router.post('/', async (req, res, next) => {
  try {
    const result = await createScreening(req.body);
    
    // If AJAX request (header), return JSON
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, screening: result });
    }
    
    // Otherwise form submission, redirect
    res.redirect('/admin/screenings');
  } catch (error) {
    next(error);
  }
});

// Move screening on timeline (AJAX)
router.patch('/:id/move', moveScreening);

// Cancel screening
router.delete('/:id', cancelScreening);

module.exports = router;
```

---

## 8. Service Layer Architecture

### Service Pattern Explanation

**Why services exist**: Separation of concerns. Controllers handle HTTP, services handle business logic.

```
HTTP Request
    ↓
Controller (req/res, status codes)
    ↓
Service (pure business logic, no req/res)
    ↓
Models (database operations)
    ↓
MongoDB
```

### Service: ScreeningService

**File**: `services/screeningService.js`

#### Core Methods:

**1. `buildInitialSeatOccupancy(hallId)`**

Mirrors the hall's seat layout, initializing every seat as "available".

```javascript
async buildInitialSeatOccupancy(hallId) {
  const hall = await Hall.findById(hallId);
  
  // Transform hall.seats 2D array
  return hall.seats.map(row =>
    row.map(seatType => ({
      type: seatType,
      status: seatType ? 'available' : 'blocked'  // null → blocked
    }))
  );
}
```

**Example**:
- Input hall seats: `[['standard', 'standard', null, 'reclined']]`
- Output seat occupancy: `[[{type:'standard',status:'available'}, {type:'standard',status:'available'}, {type:null,status:'blocked'}, {type:'reclined',status:'available'}]]`

**2. `createScreening(data)`**

Main screening creation logic with validation:

```javascript
async createScreening({
  movieId,
  hallId,
  screeningDate,
  startTime
}) {
  // 1. Fetch movie and hall
  const movie = await Movie.findById(movieId);
  const hall = await Hall.findById(hallId);
  
  // 2. Validate hall is not in maintenance
  const isMaintaining = hall.maintenanceStart <= screeningDate
    && screeningDate <= hall.maintenanceEnd;
  if (isMaintaining) {
    throw new Error('Hall under maintenance');
  }
  
  // 3. Check for overlapping screenings with buffer
  const conflict = await this._checkForOverlap(hallId, screeningDate, startTime, movie.durationMinutes);
  if (conflict) {
    throw new Error('Time slot conflicts with existing screening');
  }
  
  // 4. Build seat occupancy matrix
  const seatOccupancy = await this.buildInitialSeatOccupancy(hallId);
  
  // 5. Calculate end time
  const endTime = this._calculateEndTime(startTime, movie.durationMinutes);
  
  // 6. Create screening document
  const screening = await Screening.create({
    movieId,
    hallId,
    screeningDate,
    startTime,
    endTime,
    seatOccupancy,
    status: 'scheduled'
  });
  
  // 7. Update movie's denormalized screening count
  await Movie.updateOne(
    { _id: movieId },
    { $inc: { futureScreeningsCount: 1 } }
  );
  
  return screening;
}
```

**3. `_checkForOverlap(hallId, date, startTime, movieDurationMinutes)`**

Overlap Detection Algorithm:

```javascript
async _checkForOverlap(hallId, date, startTime, durationMinutes) {
  // Parse times to minutes since midnight
  const newStart = this._timeToMinutes(startTime);
  const newEnd = newStart + durationMinutes;
  
  // Fetch all screenings for this hall on the same date
  const existingScreenings = await Screening.find({
    hallId,
    screeningDate: {
      $gte: new Date(date),
      $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
    },
    status: { $ne: 'cancelled' }
  });
  
  // Buffer: 10 minutes after each movie ends
  const BUFFER = 10;
  
  for (const existing of existingScreenings) {
    const existingStart = this._timeToMinutes(existing.startTime);
    const existingEnd = this._timeToMinutes(existing.endTime) + BUFFER;
    
    // Detect overlap: new screening doesn't fit in the gap
    if (newStart < existingEnd && newEnd + BUFFER > existingStart) {
      return existing;  // Conflict found
    }
  }
  
  return null;  // No conflicts
}
```

**Timeline Logic**:
```
Existing:  [====10:00-11:00====][+10min buffer]
                                 11:10

New:       Want to book 11:15-12:00
           Start (11:15) >= buffer end (11:10) ✓ OK
           
New:       Want to book 11:05-11:40
           Start (11:05) < buffer end (11:10) ✗ CONFLICT
```

**4. `updateScreening(id, updates)`**

```javascript
async updateScreening(id, { startTime, hallId, screeningDate }) {
  const screening = await Screening.findById(id);
  const movie = await Movie.findById(screening.movieId);
  
  // Validate new time slot
  const conflict = await this._checkForOverlap(
    hallId,
    screeningDate,
    startTime,
    movie.durationMinutes
  );
  
  if (conflict && conflict._id.toString() !== id) {
    throw new Error('New time slot conflicts');
  }
  
  // Update
  screening.startTime = startTime;
  screening.endTime = this._calculateEndTime(startTime, movie.durationMinutes);
  screening.screeningDate = screeningDate;
  
  return await screening.save();
}
```

**5. `markCompletedScreenings()`**

Batch operation (runs daily via cron/scheduler):

```javascript
async markCompletedScreenings() {
  const yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  
  return await Screening.updateMany(
    {
      screeningDate: { $lt: yesterday },
      status: 'scheduled'
    },
    { status: 'completed' }
  );
}
```

### Service: MovieService

**File**: `services/movieService.js`

**Key responsibility**: Attach screening counts to each movie via aggregation pipeline.

```javascript
async getAllMovies() {
  const movies = await Movie.find();
  return this._attachScreeningCounts(movies);
}

async _attachScreeningCounts(movies) {
  // Use aggregation to count future screenings per movie
  const counts = await Screening.aggregate([
    {
      $match: {
        movieId: { $in: movies.map(m => m._id) },
        screeningDate: { $gte: new Date() }
      }
    },
    {
      $group: {
        _id: '$movieId',
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Create lookup map
  const countMap = {};
  counts.forEach(c => countMap[c._id] = c.count);
  
  // Attach to each movie
  return movies.map(movie => ({
    ...movie.toObject(),
    futureScreeningsCount: countMap[movie._id] || 0
  }));
}
```

### Service: HallService

**File**: `services/hallService.js`

```javascript
async validateMaintenanceDates(start, end) {
  if (start >= end) {
    throw new Error('Start date must be before end date');
  }
  
  // Check hall is not already in maintenance
  const today = new Date();
  if (start < today) {
    throw new Error('Cannot schedule maintenance in the past');
  }
}

async processSeatMatrix(seatMatrix) {
  // Validate matrix format
  // Calculate seat type counts
  // Return { seatTypes: {standard: 10, reclined: 5} }
}
```

---

## 9. Frontend: Layout & Templating

### EJS + express-ejs-layouts

**How templating works**:

1. **Layout Shell** (`views/layouts/main.ejs`):
   ```ejs
   <!DOCTYPE html>
   <html>
   <head>
       <meta charset="utf-8">
       <title>CineVillage</title>
       <%- style %>  <!-- CSS per-page -->
   </head>
   <body>
       <%- include('../partials/header') %>
       
       <div class="container main-content">
           <%- body %>  <!-- Page-specific content -->
       </div>
       
       <%- include('../partials/footer') %>
       <%- script %>  <!-- JS per-page -->
   </body>
   </html>
   ```

2. **Page Content** (`views/movies/index.ejs`):
   ```ejs
   <h1>Movies</h1>
   <p><%= movies.length %> movies available</p>
   ```

3. **Rendering** (in controller):
   ```javascript
   res.render('movies/index', {
     movies: [...],
     layout: 'layouts/main'  // Auto-used by middleware
   });
   ```

   **Result**:
   ```html
   [Header]
   <h1>Movies</h1>
   <p>5 movies available</p>
   [Footer]
   ```

### View Structure

```
views/
├─ layouts/
│  └─ main.ejs          (shared shell with header/footer)
├─ partials/
│  ├─ header.ejs        (navigation bar)
│  ├─ navbar.ejs        (top nav)
│  ├─ sidebar.ejs       (left sidebar with menu)
│  └─ footer.ejs        (footer scripts)
├─ auth/
│  ├─ login.ejs
│  ├─ register.ejs
│  ├─ forgot-password.ejs
│  └─ reset-password.ejs
├─ dashboard/
│  └─ index.ejs         (main admin dashboard)
├─ halls/
│  ├─ index.ejs         (list)
│  ├─ create.ejs        (form wrapper)
│  ├─ edit.ejs          (form wrapper with current data)
│  └─ show.ejs          (detail view)
├─ movies/
│  ├─ index.ejs         (list)
│  ├─ create.ejs
│  └─ form.ejs          (reused by create/edit)
├─ screenings/
│  ├─ index.ejs         (timeline scheduler)
│  └─ show.ejs
└─ error.ejs            (error page)
```

### Flash Messages Pattern

**In View** (`layouts/main.ejs`):
```ejs
<% if (flash && flash.message) { %>
  <div class="alert alert-<%= flash.type || 'info' %> alert-dismissible fade show">
    <%= flash.message %>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>
<% } %>
```

**In Controller**:
```javascript
req.session.flash = {
  type: 'success',
  message: 'Hall updated successfully'
};
res.redirect('/admin/halls');
```

**In Middleware** (app.js):
```javascript
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;  // Clear after this request
  next();
});
```

---

## 10. Screening Scheduler UI

### Timeline Scheduler Page (`views/screenings/index.ejs`)

#### Layout:
```
┌─────────────────────────────────────────────┐
│ Timeline Toolbar (date, AM/PM toggle)       │
├────────────────────────┬────────────────────┤
│                        │ Movie Library      │
│ Timeline Master Grid   │ [Search Input] ← NEW
│ (halls × time slots)   │                    │
│                        │ [Draggable movie   │
│                        │  buttons]          │
├────────────────────────┴────────────────────┤
│ Helper text                                 │
└─────────────────────────────────────────────┘
```

#### Movie Library with Search

**HTML Structure** (now updated):
```html
<div class="card">
  <div class="card-header">
    <h5><i class="bi bi-film"></i>Movie Library</h5>
  </div>
  
  <!-- NEW: Search input -->
  <div class="card-body pb-2">
    <div class="input-group input-group-sm mb-3">
      <span class="input-group-text bg-transparent border-secondary">
        <i class="bi bi-search text-muted"></i>
      </span>
      <input
        id="movieLibrarySearch"
        type="search"
        class="form-control border-secondary bg-transparent text-light"
        placeholder="Search movies…"
        autocomplete="off">
    </div>
  </div>
  
  <!-- Movie buttons -->
  <div class="card-body pt-0">
    <div id="timelineMovieLibrary" class="d-flex flex-column gap-2">
      <button class="btn btn-outline-secondary timeline-movie-item" draggable="true"
              data-movie-id="<%= movie._id %>"
              data-duration="<%= movie.durationMinutes %>"
              data-title="<%= movie.title %>">
        <span class="fw-semibold"><%= movie.title %></span>
        <small class="text-muted"><%= movie.durationMinutes %> min • <%= movie.genre %></small>
      </button>
    </div>
  </div>
</div>
```

#### JavaScript: Movie Search Filter

**File**: `public/js/main.js`

```javascript
// Movie library search filter
const movieSearchInput = document.getElementById('movieLibrarySearch');
if (movieSearchInput) {
  movieSearchInput.addEventListener('input', () => {
    const query = movieSearchInput.value.trim().toLowerCase();
    
    movieItems.forEach((item) => {
      // Extract movie metadata
      const title = (item.dataset.title || '').toLowerCase();
      const genre = item.querySelector('small')
        ? item.querySelector('small').textContent.toLowerCase()
        : '';
      
      // Test: matches title OR genre
      const matches = !query 
        || title.includes(query) 
        || genre.includes(query);
      
      // Show/hide: hide by setting display:none
      item.style.display = matches ? '' : 'none';
    });
  });
}
```

**Behavior**:
- User types "Action" → filters to Action movies
- User types "120" → filters to 120-min movies
- User clears → shows all movies
- Real-time filtering (no page reload)

#### Timeline Data Encoding

Movies and halls are encoded as JSON in data attributes:

```javascript
// In controller
const timelineHalls = halls.map(h => ({
  id: h._id,
  code: h.code,
  name: h.name
}));

const timelineScreenings = screenings.map(s => ({
  id: s._id,
  hallId: s.hallId,
  movieId: s.movieId,
  startTime: s.startTime,
  endTime: s.endTime,
  title: movie.title
}));

// In view
<div id="screeningScheduler"
     data-halls="<%- encodeURIComponent(JSON.stringify(timelineHalls)) %>"
     data-screenings="<%- encodeURIComponent(JSON.stringify(timelineScreenings)) %>">
```

**Why encode?**:
- `JSON.stringify()` converts objects to strings
- `encodeURIComponent()` escapes special HTML characters (quotes, angle brackets)
- JavaScript later decodes: `JSON.parse(decodeURIComponent(attr))`

#### Timeline Grid Rendering

**Grid dimensions**:
- Rows: one per hall
- Columns: 30-minute time slots (configurable)
- Time range: 06:00 to 22:00 (16 hours × 2 = 32 slots)

**CSS Grid**:
```css
.timeline-master-grid {
  display: grid;
  grid-template-columns: 150px repeat(32, 1fr);  /* 32 × 30-min slots */
  gap: 1px;
  background: #333;
}

.timeline-row {
  grid-column: 1 / 2;  /* Hall label column */
}

.timeline-slot {
  grid-column: auto;
  height: 60px;
  min-width: 40px;
  background: #222;
  border: 1px solid #333;
}
```

---

## 11. File Upload & Image Processing

### Movie Poster Upload

**Middleware**: `middleware/uploadMiddleware.js` (multer configuration)

**Flow**:
```
User selects file via <input type="file">
                 ↓
             Form submits
                 ↓
    multer middleware intercepts
                 ↓
  File validation (MIME type, size)
                 ↓
  Saved to disk: public/uploads/posters/
                 ↓
  Filename passed to controller as req.file.filename
                 ↓
  Controller stores filename in DB: posterUrl
```

**HTML Form** (`views/movies/form.ejs`):
```html
<form method="POST" enctype="multipart/form-data">
  <input type="file" name="posterImage" accept="image/*" required>
  <input type="hidden" name="_method" value="PUT">
  <button type="submit">Upload & Save</button>
</form>
```

**Middleware Config**:
```javascript
const upload = multer({
  storage: diskStorage({
    destination: 'public/uploads/posters',
    filename: (req, file, cb) => {
      const uniqueName = `movie_${Date.now()}_${Math.random().toString(36)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Invalid format'), allowed.includes(file.mimetype));
  },
  limits: { fileSize: 5 * 1024 * 1024 }  // 5 MB
});
```

**Controller Integration** (`controllers/movieController.js`):
```javascript
exports.createMovie = async (req, res, next) => {
  try {
    const posterUrl = req.file ? `/uploads/posters/${req.file.filename}` : null;
    
    const movie = await movieService.createMovie({
      title: req.body.title,
      genre: req.body.genre,
      durationMinutes: req.body.duration,
      posterUrl
    });
    
    req.session.flash = { type: 'success', message: 'Movie created' };
    res.redirect('/admin/movies');
  } catch (error) {
    next(error);
  }
};
```

**Error Handling**:
```javascript
// If multer rejects file
router.post('/', upload.single('posterImage'), (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).render('movies/create', {
      message: `Upload error: ${err.message}`
    });
  }
  // Continue to controller
  next();
});
```

---

## 12. Error Handling & Validation

### Validation Strategy

**Three-layer validation**:

1. **Client-side** (HTML5):
   ```html
   <input type="email" required>
   <input type="number" min="10" max="1000">
   ```

2. **Middleware** (before controller):
   ```javascript
   router.post('/', validationMiddleware.validateHallForm, hallController.createHall);
   
   // Middleware checks format, required fields, ranges
   ```

3. **Database** (Mongoose schema):
   ```javascript
   const hallSchema = new Schema({
     capacity: {
       type: Number,
       required: [true, 'Capacity is required'],
       min: [10, 'Capacity must be at least 10'],
       max: [1000, 'Capacity cannot exceed 1000']
     }
   });
   ```

### Error Handler Middleware

**File**: `middleware/errorMiddleware.js`

```javascript
exports.errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  // Handle specific errors
  
  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map(e => e.message)
      .join(', ');
  }
  
  // Mongoose Duplicate Key (e.g., unique username)
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    statusCode = 400;
    message = `${field} already exists`;
  }
  
  // JWT/Auth errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  
  // Multer errors (file upload)
  if (err.message?.includes('File too large')) {
    statusCode = 413;
    message = 'File exceeds 5MB limit';
  }
  
  // Render error page
  res.status(statusCode).render('error', {
    message,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};
```

**Error page** (`views/error.ejs`):
```ejs
<div class="error-container">
  <h1><%= message %></h1>
  <% if (error && error.stack) { %>
    <pre><%= error.stack %></pre>
  <% } %>
  <a href="javascript:history.back()">Go Back</a>
</div>
```

---

## 13. Data Persistence & Transactions

### MongoDB Data Persistence

**Document vs Relational**:

| Aspect | MongoDB | SQL |
|--------|---------|-----|
| Structure | Dynamic JSON-like documents | Rigid tables/rows |
| Joins | Embedding or `$lookup` | Foreign keys + JOIN |
| Transactions | Single doc atomic; multi-doc optional | Multi-table ACID |

#### Denormalization Example: Movie Screening Count

**Approach 1: Compute on-demand (slower)**
```javascript
const movieWithCount = await Movie.findById(id);
const count = await Screening.countDocuments({ movieId: id, screeningDate: { $gte: new Date() } });
```

**Approach 2: Denormalize (faster)**
```javascript
// Movie schema includes:
futureScreeningsCount: Number

// When screening created:
await Movie.updateOne({ _id: movieId }, { $inc: { futureScreeningsCount: 1 } });

// When screening deleted:
await Movie.updateOne({ _id: movieId }, { $inc: { futureScreeningsCount: -1 } });

// Query is now instant:
const movie = await Movie.findById(id);  // futureScreeningsCount included
```

### Multi-Document Updates

**Atomic batch operations**:

```javascript
// Mark all old screenings as completed
const result = await Screening.updateMany(
  {
    screeningDate: { $lt: new Date() },
    status: 'scheduled'
  },
  { status: 'completed' });

console.log(`${result.modifiedCount} screenings marked complete`);
```

**Session/Transaction** (enterprise feature, optional):
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  await Screening.findByIdAndDelete(id, { session });  // Delete screening
  await Movie.updateOne({ _id: movieId }, { $inc: { futureScreeningsCount: -1 } }, { session });  // Update count
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
finally {
  await session.endSession();
}
```

---

## 14. Client-Side Interactivity & State Management

### JavaScript Architecture

**File**: `public/js/main.js` (~1089 lines)

#### 1. **Global State Variables**

```javascript
let dragPayload = null;           // Current drag operation data
let previewSpan = null;           // Preview element during drag
let selectedScreeningForEdit = null;  // Editing mode
let activeView = 'AM';            // Timeline view (AM or PM)
let SLOT_MINUTES = 30;            // Grid unit size
let cleaningBuffer = 10;          // Minutes buffer between movies
```

#### 2. **Movie Library Search** (NEW FEATURE)

```javascript
const movieSearchInput = document.getElementById('movieLibrarySearch');
if (movieSearchInput) {
  movieSearchInput.addEventListener('input', () => {
    const query = movieSearchInput.value.trim().toLowerCase();
    
    // Filter movie items in real-time
    movieItems.forEach((item) => {
      const title = (item.dataset.title || '').toLowerCase();
      const genre = item.querySelector('small')?.textContent.toLowerCase() || '';
      
      const matches = !query || title.includes(query) || genre.includes(query);
      item.style.display = matches ? '' : 'none';
    });
  });
}
```

**User experience**:
- Type "Action" → only Action movies visible
- Type "90" → only ~90-minute movies visible
- Clear field → all movies reappear
- No page reload needed

#### 3. **Seat Matrix Editor**

Component for creating/editing hall seat layouts visually:

**Modes**:
- **Viewing**: Display seat grid, read-only
- **Editing**: Click seats to cycle through types (standard → reclined → disabled → blank)

**Data structure**:
```javascript
const seatMatrix = [
  ['standard', 'standard', null, 'reclined'],
  ['standard', 'standard', null, 'reclined'],
  ['reclined', 'reclined', null, 'disabled']
];
// Serialized to form input: JSON string or array format
```

**Code flow**:
```javascript
function generateSeatGrid(seatMatrix) {
  const grid = document.createElement('div');
  grid.className = 'seat-grid';
  
  seatMatrix.forEach((row, r) => {
    row.forEach((seatType, c) => {
      const seat = document.createElement('button');
      seat.className = `seat seat-${seatType}`;
      seat.dataset.row = r;
      seat.dataset.col = c;
      
      seat.addEventListener('click', () => cycleSeatType(seat, seatMatrix, r, c));
      grid.appendChild(seat);
    });
  });
  
  return grid;
}

function cycleSeatType(seatEl, matrix, row, col) {
  const cycle = [null, 'standard', 'reclined', 'disabled'];
  const current = matrix[row][col];
  const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
  
  matrix[row][col] = cycle[nextIndex];
  seatEl.className = `seat seat-${cycle[nextIndex]}`;
  updateCapacityStats();
}
```

#### 4. **Timeline Scheduler (Drag & Drop)**

**Architecture**:

```
renderMasterGrid()
  ├─ Build time header (06:00, 06:30, ..., 22:00)
  ├─ Loop halls
  │  ├─ Build hall row with CSS Grid
  │  └─ Loop screenings for this hall on this date
  │     └─ Position screening block based on startTime + duration
  └─ Attach event listeners
     ├─ movieItems: dragstart/dragend → droppable zones
     ├─ timeSlots: dragover/drop → handle placement
     └─ screeningBlocks: click → edit modal
```

**Drag payload**:
```javascript
// When dragging movie
dragPayload = {
  type: 'movie',
  movieId: 'xxx',
  durationMinutes: 120,
  title: 'Movie Title'
};

// When dragging existing screening
dragPayload = {
  type: 'screening',
  screeningId: 'yyy',
  movieId: 'xxx',
  durationMinutes: 120
};
```

**Drop zones**:
- **Hall rows**: Accept movies, create new screening
- **Existing screening blocks**: Accept screenings, move to new time

**Conflict resolution**:
```javascript
async function placeScreening(hallId, startTime, movieId) {
  try {
    const response = await fetch('/admin/screenings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hallId, startTime, movieId })
    });
    
    if (response.ok) {
      showAlert('Screening scheduled successfully', 'success');
      renderMasterGrid();  // Refresh UI
    } else {
      const error = await response.json();
      showAlert(error.message, 'danger');  // e.g., "Time slot conflicts"
    }
  } catch (error) {
    showAlert('Scheduling failed: ' + error.message, 'danger');
  }
}
```

#### 5. **AJAX Movie Library with Search**

Updating the timeline without page reload:

```javascript
// Fetch fresh movie list from server
async function refreshMovieLibrary() {
  const response = await fetch('/api/movies');
  const movies = await response.json();
  
  // Rebuild movie library HTML
  const libraryDiv = document.getElementById('timelineMovieLibrary');
  libraryDiv.innerHTML = '';
  
  movies.forEach(movie => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-secondary timeline-movie-item';
    btn.draggable = true;
    btn.dataset.movieId = movie._id;
    btn.dataset.duration = movie.durationMinutes;
    btn.dataset.title = movie.title;
    btn.innerHTML = `
      <span class="fw-semibold">${movie.title}</span>
      <small>${movie.durationMinutes} min • ${movie.genre}</small>
    `;
    
    btn.addEventListener('dragstart', handleMovieDragStart);
    libraryDiv.appendChild(btn);
  });
}
```

#### 6. **Session Warning Timer**

Warns user before session expires:

```javascript
function setupSessionWarning() {
  // Session expires in SESSION_TIMEOUT milliseconds (default 24 hours)
  const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
  const WARNING_TIME = 5 * 60 * 1000;  // Warn at 5 minutes before expiry
  
  setInterval(() => {
    const elapsed = Date.now() - sessionStartTime;
    const remaining = SESSION_TIMEOUT - elapsed;
    
    if (remaining < WARNING_TIME && remaining > 0) {
      showSessionWarningModal(remaining);
    }
    
    if (remaining <= 0) {
      // Session expired, redirect to login
      window.location.href = '/auth/login';
    }
  }, 60000);  // Check every minute
}
```

#### 7. **Form Utilities**

Helper functions used across all pages:

```javascript
// Serialize form data to JSON
function getFormData(formElement) {
  const formData = new FormData(formElement);
  const data = {};
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

// Add loading state to submit button
function addLoadingHandler(form) {
  form.addEventListener('submit', () => {
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.classList.add('loading');
  });
}

// Show dismissible alert
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  const container = document.querySelector('.main-content');
  container.insertBefore(alertDiv, container.firstChild);
  
  // Auto-dismiss after 5 seconds (non-error alerts)
  if (!['danger', 'warning'].includes(type)) {
    setTimeout(() => alertDiv.remove(), 5000);
  }
}
```

---

## Appendix A: File-by-File Deep Dive

### A.1 package.json

**Purpose**: Declares all npm dependencies and scripts.

```json
{
  "name": "cinevillage",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "express-session": "^1.17.3",
    "connect-mongo": "^5.0.0",
    "multer": "^1.4.5-lts.1",
    "ejs": "^3.1.9",
    "express-ejs-layouts": "^2.5.1",
    "method-override": "^3.0.0",
    "dotenv": "^16.0.3"
  }
}
```

### A.2 config/db.js

**Single responsibility**: Establish MongoDB connection.

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(`✓ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('✗ MongoDB error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### A.3 All Controllers

| Controller | Methods | Responsibility |
|------------|---------|-----------------|
| authController.js | login, register, forgotPassword, resetPassword | User authentication & password recovery |
| dashboardController.js | index | Dashboard stats (concurrent queries) |
| hallController.js | getAllHalls, createHall, updateHall, deleteHall | Hall CRUD + seat matrix processing |
| movieController.js | getAllMovies, createMovie, updateMovie, deleteMovie | Movie CRUD + poster upload |
| screeningController.js | index, createScreening, moveScreening, cancelScreening | Timeline scheduling + occupancy |

### A.4 All Services

| Service | Methods | Responsibility |
|---------|---------|-----------------|
| screeningService.js | createScreening, updateScreening, moveScreening, cancelScreening, markCompletedScreenings, \_checkForOverlap, buildInitialSeatOccupancy | Core scheduling logic with conflict detection |
| movieService.js | getAllMovies, \_attachScreeningCounts | Movie queries + denormalization |
| hallService.js | validateMaintenanceDates, processSeatMatrix | Hall validation & seat processing |

### A.5 All Routes

| Route File | Mounts | Methods |
|-----------|--------|---------|
| authRoutes.js | /auth | GET/POST login, register, forgot, reset |
| adminRoutes.js | /admin | GET dashboard, settings |
| hallRoutes.js | /admin/halls | GET/POST/PUT/DELETE halls |
| movieRoutes.js | /admin/movies | GET/POST/PUT/DELETE movies + upload |
| screeningRoutes.js | /admin/screenings | GET/POST/PATCH/DELETE screenings |

### A.6 All Middleware

| Middleware | Purpose |
|-----------|---------|
| authMiddleware.js | require login, inject user |
| errorMiddleware.js | centralize error handling |
| uploadMiddleware.js | multer file upload config |
| validationMiddleware.js | input validation helpers |

### A.7 CSS Files

| File | Purpose |
|------|---------|
| styles.css | Custom CSS + dark theme overrides, seat matrix grid, timeline grid |
| templatemo-crypto-*.css | Bootstrap theme (dashboard, login, pages, style) |

### A.8 main.js Sections

| Lines | Section | Functionality |
|-------|---------|-----------------|
| 1–200 | Global setup | Theme, sidebar, alerts, form validation |
| 201–400 | Seat editor | Grid generation, mode cycling, stats |
| 401–800 | Timeline scheduler | Grid rendering, drag-drop setup |
| 801–1030 | AJAX operations | Create/move/cancel screenings |
| 1031–1089 | Movie library + initialization | **Search filter** (NEW) + drag handlers |

---

## Appendix B: Execution Traces & Pseudo-Code

### B.1 Application Startup Trace

```
1. Node.js reads app.js
   ↓
2. require() imports: express, mongoose, middleware, routes
   ↓
3. connectDB() executes → MongoDB client connects
   ↓
4. Express app created: app = express()
   ↓
5. Middleware registered (in order):
   - Body parsers
   - Session middleware (connects to MongoDB)
   - Custom user/flash injection
   ↓
6. Routes mounted:
   - /auth → authRoutes
   - /admin → adminRoutes
   - /admin/halls → hallRoutes
   - /admin/movies → movieRoutes
   - /admin/screenings → screeningRoutes
   ↓
7. Error handler registered (last)
   ↓
8. app.listen(3000)
   ↓
9. Console: "✓ Server running on port 3000"
   ✓ Application ready for requests
```

### B.2 Successful User Login Trace

```
1. User clicks "Login" button on /auth/login form
   ↓
2. POST /auth/login with { username, password }
   ↓
3. authController.login() called
   ├─ Find user by username in DB
   ├─ Check if account is locked
   ├─ Compare submitted password with hash (bcrypt.compare)
   ├─ Match? Yes → Reset lockoutAttempts = 0
   └─ Match? No → Increment lockoutAttempts, possibly lock
   ↓
4. Create session:
   req.session.userId = user._id
   req.session.username = user.username
   ↓
5. Session middleware saves session to MongoDB (connect-mongo)
   ↓
6. Set-Cookie header sent to client with session ID
   ↓
7. Redirect to /admin/dashboard
   ↓
8. GET /admin/dashboard
   ├─ requireLogin middleware checks req.session.userId
   ├─ Session exists? Yes → Allow
   └─ dashboardController.index() executes
   ↓
9. Dashboard queriesfor data (movies, halls, screenings count)
   ↓
10. res.render('dashboard/index', { movies, halls, statistics })
    ├─ EJS template rendered with layout
    └─ HTML sent to client
    ✓ User logged in, session active
```

### B.3 Brute-Force Lockout Trace

```
1. User enters wrong password 5 times on /auth/login
   ↓
2. Controller increments user.lockoutAttempts each time
   ↓
3. After 5th attempt:
   - user.lockoutAttempts = 5
   - user.lock(15) sets:
     * user.lockoutUntil = Date.now() + 15 * 60 * 1000
     * user.save()
   ↓
4. User tries login 6th time:
   - user.isLocked() checks: lockoutUntil > Date.now()? Yes
   - Return: "Account locked. Try again later."
   ↓
5. User waits 15 minutes
   ↓
6. user.isLocked() now returns false
   ↓
7. Login attempt 7:
   - Password check succeeds
   - user.lockoutAttempts = 0
   - user.lockoutUntil = null
   ✓ Account unlocked, user logged in
```

### B.4 Create Screening (Overlap Detection) Trace

```
INPUT: movieId='A', hallId='H1', screeningDate='2026-03-20', startTime='14:00'

1. screeningService.createScreening() called
   ↓
2. Fetch movie (duration = 120 minutes)
   Fetch hall (check if under maintenance)
   ↓
3. Call _checkForOverlap(hallId='H1', date='2026-03-20', startTime='14:00', duration=120)
   ├─ Convert new startTime '14:00' → 840 minutes since midnight
   ├─ Calculate newEnd = 840 + 120 = 960 min (16:00)
   ├─ Query DB for existing screenings on 2026-03-20 in hall H1
   │  └─ Results:
   │     - Screening X: startTime='13:00' (780 min), endTime='15:00' (900 min)
   │     - Screening Y: startTime='16:30' (990 min), endTime='18:30' (1110 min)
   │
   ├─ Loop through existing:
   │  ├─ Screening X: existingEnd + buffer = 900 + 10 = 910
   │  │  Overlap check: newStart (840) < existingEnd+buffer (910)? YES
   │  │              AND newEnd+buffer (970) > existingStart (780)? YES
   │  │  → OVERLAP DETECTED!
   │  └─ Return existing screening (Conflict)
   ↓
4. Controller catches conflict:
   throw new Error('Time slot conflicts with existing screening')
   ↓
5. Error handler catches, returns JSON:
   { success: false, message: 'Time slot conflicts...' }
   ✓ Request fails with 400 status
```

### B.5 Move Screening on Timeline Trace

```
INPUT: screeningId='S1', newStartTime='15:30'

1. User drags existing screening block to new time slot on UI
   ↓
2. dragstart event fires:
   dragPayload = { type: 'screening', screeningId: 'S1', movieId: 'A', durationMinutes: 120 }
   ↓
3. dragover event on target time slot:
   showPreview(hallId, newStartTime, durationMinutes)
   ├─ Visually highlight the target slot
   └─ Calculate endTime
   ↓
4. drop event:
   ├─ clearPreview()
   └─ AJAX POST /admin/screenings/S1/move { startTime: '15:30' }
   ↓
5. Backend: screeningController.moveScreening()
   ├─ Fetch existing screening (old time)
   ├─ Call screeningService.updateScreening()
   │  ├─ Check overlap with new time
   │  ├─ If overlap found → throw error
   │  └─ If OK → Update screening.startTime, save
   └─ Return JSON { success: true, screening: {...} }
   ↓
6. Front end: Response received
   ├─ Re-render timeline grid
   ├─ Show "Screening moved" success message
   └─ Refresh movie library (if needed)
   ✓ Screening now at new time
```

### B.6 Edit Screening via Modal Trace

```
1. User clicks existing screening block on timeline
   ↓
2. Click handler:
   selectedScreeningForEdit = screeningData
   showEditModal(screeningData)
   ├─ Populate form with current values
   ├─ Hall dropdown set to current hall
   ├─ Time input set to startTime
   └─ Show modal
   ↓
3. User changes startTime to '16:00' and clicks Save
   ↓
4. Modal submit handler:
   AJAX POST /admin/screenings/:id { startTime: '16:00' }
   ↓
5. Backend processes, returns { success: true }
   ↓
6. Frontend:
   ├─ Close modal
   ├─ Re-render timeline
   └─ Show success flash
   ✓ Screening updated
```

### B.7 Delete vs Cancel Screening Trace

```
DELETE Operation (removes from DB):
  1. User clicks delete icon on screening block
  2. Confirm("Delete this screening?")
  3. DELETE /admin/screenings/S1
  4. Backend: screening removed from DB completely
  5. Movie.futureScreeningsCount decremented
  6. UI re-renders, block gone

CANCEL Operation (marks as cancelled, keeps record):
  1. User clicks cancel button on screening detail page
  2. PATCH /admin/screenings/S1/cancel { status: 'cancelled' }
  3. Backend: screening.status = 'cancelled'
  4. Saved to DB (record preserved for audit trail)
  5. UI marks as greyed out (still visible but inactive)
```

### B.8 Seat Occupancy Update Trace

```
1. User attends screening, buys ticket for Seat[2][1]
   
2. Frontend: User clicks seat button to mark SOLD
   └─ AJAX PATCH /admin/screenings/:id/seat
      { rowIndex: 2, colIndex: 1, status: 'sold' }
   
3. Backend:
   ├─ Find screening document
   ├─ Access seatOccupancy[2][1]
   ├─ Update status: 'available' → 'sold'
   ├─ screening.save()
   └─ Return updated occupancy grid
   
4. Frontend:
   ├─ Update visual seat grid
   ├─ Change seat color (green → red/sold)
   └─ Update capacity counter (X / Total available)
   ✓ Seat marked as sold
```

### B.9 Movie Search Filter Trace

```
1. User opens Screening Scheduler (/admin/screenings)
   ├─ Movies loaded from backend
   ├─ Movie library populated with buttons
   └─ Event listeners attached
   
2. User types "Action" in search box
   ↓
3. Input event fires:
   query = 'action' (lowercased, trimmed)
   
4. JavaScript filter logic:
   movieItems.forEach(item => {
     title = item.dataset.title.toLowerCase() = 'godzilla' (example)
     genre = item.querySelector('small').textContent.toLowerCase() = 'action thriller'
     
     matches = query ('action') included in title ('godzilla')? NO
            OR query ('action') included in genre ('action thriller')? YES
     
     item.style.display = 'block'  // Show this movie
   })
   
5. Non-action movies:
   item.style.display = 'none'  // Hide
   
6. UI updates instantly (no network call)
   ✓ User sees filtered list
```

### B.10 Session Data Persistence Trace

```
1. User logs in successfully
   └─ Express-session stores in memory: sessionID → { userId, username }
   
2. connect-mongo store syncs to MongoDB:
   Collection: 'sessions' document added:
   {
     _id: 'sessionID123',
     session: { userId: 'user_xxx', username: 'john' },
     expires: <date 24 hours from now>
   }
   
3. Client receives Set-Cookie header:
   Set-Cookie: connect.sid=sessionID123; Path=/; HttpOnly
   
4. Browser stores cookie (HTTP-only, not accessible to JS)
   
5. Next request: User navigates to /admin/halls
   ├─ Browser sends Cookie: connect.sid=sessionID123
   ├─ Express-session middleware:
   │  ├─ Reads cookie
   │  ├─ Queries MongoDB for sessionID123
   │  └─ Populates req.session = { userId, username }
   └─ Controller accesses req.session.userId
   
6. Server restart or network issue:
   ├─ Session persisted in MongoDB
   ├─ Browser still has cookie
   └─ User can resume (session not lost)
   ✓ Persistence confirmed
```

### B.11 Password Reset Flow Trace

```
POST /auth/forgot-password { email: 'john@example.com' }
   ↓
1. Find user by email
   ├─ User found? Continue
   └─ User not found? Return "Check your email" (security: don't reveal)
   ↓
2. Generate random reset token (crypto.randomBytes)
   resetToken = 'a3f8c2d9x...' (random string)
   ↓
3. Hash token for storage (never store plain text):
   user.resetToken = hash(resetToken)
   user.resetTokenExpiry = Date.now() + 1 * 60 * 60 * 1000  // 1 hour
   ↓
4. Save user with token
   ↓
5. Send email (or log for demo):
   Reset link: /auth/reset-password?token=a3f8c2d9x...
   ↓
6. User clicks link
   GET /auth/reset-password?token=a3f8c2d9x...
   ├─ Extract token from query
   ├─ Hash it
   ├─ Compare with user.resetToken
   └─ Check expiry: resetTokenExpiry > Date.now()?
   
7. Token valid? Show password form
   ↓
8. POST /auth/reset-password { password, token }
   ├─ Find user by hashed token
   ├─ Verify not expired
   ├─ UPDATE password (hashed in pre-save)
   ├─ Clear resetToken and expiry
   └─ Save user
   ✓ Password reset complete
```

### B.12 Dashboard Stats Query Trace

```
GET /admin/dashboard

1. dashboardController.index() called
   ↓
2. Execute parallel queries using Promise.all:
   ```
   const [movies, halls, screenings] = await Promise.all([
     Movie.find().limit(10),
     Hall.find(),
     Screening.countDocuments({ status: 'scheduled' })
   ]);
   ```
   
3. Each query executes concurrently (not sequential):
   ├─ Movie.find() queries 'movies' collection
   ├─ Hall.find() queries 'halls' collection  
   └─ Screening.countDocuments() counts 'screenings' documents
   
4. Results collected once all complete
   ├─ movies = [Movie, Movie, ...]
   ├─ halls = [Hall, Hall, ...]
   └─ screeningCount = 42
   
5. Compute derived stats:
   totalCapacity = halls.reduce((sum, h) => sum + h.capacity, 0)
   occupancyRate = (screened_seats / total_seats) * 100
   
6. res.render('dashboard/index', { movieCount: 10, hallCount: 3, ... })
   ↓
7. EJS template renders statistics cards in layout
   ✓ Dashboard loaded efficiently (concurrent queries, no N+1)
```

### B.13 Multer File Upload Trace

```
1. User selects movie poster on /admin/movies/new form
   └─ <input type="file" name="posterImage" accept="image/*">
   
2. User submits form (POST /admin/movies)
   ├─ Form encoding: multipart/form-data (tells server file is coming)
   └─ File attached to request body
   
3. Express middleware chain:
   ├─ Body parsers skipped (not JSON/urlencoded)
   ├─ Multer middleware intercepts (name='posterImage')
   │  ├─ Read file from stream
   │  ├─ Check MIME type: image/jpeg? image/png? Yes → OK, No → Reject
   │  ├─ Check file size: 5MB limit? Yes → OK, No → Reject (413 Payload Too Large)
   │  ├─ Generate unique filename: movie_timestamp_random.jpg
   │  ├─ Save to disk: public/uploads/posters/movie_timestamp_random.jpg
   │  └─ Populate req.file = { filename, originalname, mimetype, size }
   │
   └─ movieController.createMovie() continues
   
4. Controller:
   const posterUrl = req.file ? `/uploads/posters/${req.file.filename}` : null;
   await Movie.create({ title, genre, posterUrl });
   
5. Database stores relative path: /uploads/posters/movie_123.jpg
   
6. When rendering movie in view:
   <img src="<%= movie.posterUrl %>">
   └─ Browser requests GET /uploads/posters/movie_123.jpg
   └─ Express.static serves from public/ directory
   └─ Image displayed
   ✓ Upload complete
```

### B.14 Timeline View Toggle (AM/PM) Trace

```
1. User on /admin/screenings sees:
   ├─ Timeline: 06:00 – 14:00 (AM)
   ├─ Button: "AM Schedule" (active/primary)
   └─ Button: "PM Schedule" (outline/secondary)
   
2. User clicks "PM Schedule" button
   ↓
3. Event handler:
   activeView = 'PM';
   updateViewToggleButtons();
   renderMasterGrid();
   
4. updateViewToggleButtons():
   ├─ "AM Schedule" btn: removeClass('btn-primary'), addClass('btn-outline-primary')
   └─ "PM Schedule" btn: removeClass('btn-outline-primary'), addClass('btn-primary')
   
5. renderMasterGrid():
   ├─ Recompute time slots based on activeView
   ├─ If 'PM': slots = [14:00, 14:30, ..., 22:00]
   └─ Redraw grid with new time range
   
6. User drags movie to 16:30 slot
   └─ Server receives startTime='16:30' (correct)
   
7. After movie placement, grid re-renders
   └─ Movie block positioned correctly in PM view
   ✓ View toggle working correctly
```

### B.15 Drag-and-Drop Conflict Prevention Trace

```
1. User dragging movie "Godzilla" (120 min) over timeline
   
2. dragover event at time slot 14:30:
   ├─ Compute expected endTime: 14:30 + 120 min = 16:30
   ├─ Check overlap with existing screenings
   │  └─ If AJAX call: fetch('/api/screenings/check-overlap?, ...)
   │  └─ If local logic: check dragPayload against knownScreenings
   │
   └─ If conflict:
      ├─ Preview turns red/striped (visual warning)
      ├─ Set dragPayload.conflict = true
      └─ Don't allow drop
      
3. User moves to different slot 17:00 (after buffer):
   ├─ dragover event fires again
   ├─ Overlap check: OK
   ├─ Preview turns green
   ├─ dragPayload.conflict = false
   └─ Allow drop
      
4. User releases mouse (drop event):
   ├─ dragPayload.conflict? 
   │  └─ true: Reject, show error "Time slot conflicts"
   │  └─ false: AJAX POST /admin/screenings { movieId, hallId, startTime }
   │
   └─ Server validates again (duplicate check)
      └─ Return success/error JSON
   ✓ Double validation prevents conflicts
```

### B.16 Form Validation Pipeline Trace

```
<input type="number" min="10" max="1000" required name="capacity">
   ↓
1. CLIENT-SIDE (HTML5):
   User enters 5, submits form
   ├─ Browser checks: value < min (10)? Yes
   ├─ Show native error tooltip
   └─ Prevent form submission
   
2. USER enters 50, submits:
   ├─ HTML5 check passes
   ├─ Form data: { capacity: '50' }
   ├─ POST /admin/halls
   └─ Reaches server
   
3. MIDDLEWARE (validationMiddleware.js):
   value = req.body.capacity = 50
   ├─ Check req.body.capacity? Yes
   ├─ Check 50 >= 10 && 50 <= 1000? Yes
   └─ Call next() → Continue to controller
   
4. CONTROLLER (hallController.js):
   const { capacity } = req.body;
   const hall = new Hall({ capacity });
   ├─ Pass to service
   └─ Service creates Hall document
   
5. DATABASE (Mongoose schema):
   hallSchema.capacity = { type: Number, min: 10, max: 1000 }
   ├─ Document created
   ├─ Validation runs: capacity >= 10 && capacity <= 1000? Yes
   ├─ Index checks (unique fields)
   └─ Insert to MongoDB
   ✓ Triple validation: client, middleware, database
```

### B.17 Error Flow: Movie Without Poster Trace

```
1. POST /admin/movies (no file selected)
   ├─ req.file = undefined (multer found no file)
   ├─ Passed to movieController.createMovie()
   └─ posterUrl = null
   
2. Controller:
   const movie = await movieService.createMovie({
     title: 'New Movie',
     genre: 'Action',
     posterUrl: null  // OK, optional
   });
   
3. Movie schema:
   posterUrl: { type: String, required: false }  // No error
   
4. Document saved successfully
   └─ posterUrl field is null
   
5. When rendering movie in dashboard:
   <% if (movie.posterUrl) { %>
     <img src="<%= movie.posterUrl %>">
   <% } else { %>
     <img src="/images/placeholder.jpg">
   <% } %>
   
6. Result: Placeholder image shown
   ✓ Graceful handling of optional file
```

### B.18 Concurrent Operations: Update & Delete Race Condition Trace

```
SCENARIO: User clicks update AND delete simultaneously

1. THREAD A: PUT /admin/movies/M1 { title: 'New Title' }
   ├─ Service layer: Find & update document
   ├─ Mongoose: validateBeforeSave()
   └─ MongoDB: db.movies.updateOne({ _id: M1 }, { title: ... })
   
2. THREAD B (same time): DELETE /admin/movies/M1
   ├─ Service layer: Check screenings exist for this movie
   ├─ Mongoose: findByIdAndDelete(M1)
   └─ MongoDB: db.movies.deleteOne({ _id: M1 })
   
3. RACE CONDITIONS:
   Option A: A completes first
   └─ Document updated
   └─ B tries to delete, succeeds
   └─ Result: Document deleted (final state)
   
   Option B: B completes first
   └─ Document deleted
   └─ A tries to update, gets null (no document found)
   └─ A throws: "Document not found"
   └─ Result: Error displayed to user A
   
4. MITIGATION (not currently implemented):
   Use Mongoose sessions/transactions:
   ```
   const session = await mongoose.startSession();
   session.startTransaction();
   try {
     const movie = await Movie.findById(M1).session(session);
     // Lock acquired, other operations blocked
     ...
   } catch {
     session.abortTransaction();
   }
   ```
   ✓ Prevents race conditions
```

### B.19 Troubleshooting Decision Tree

```
ISSUE: "Session expired unexpectedly"

1. Symptom: User logged out suddenly
   └─ Is session_timeout configured too short?
      ├─ YES: Increase SESSION_MAX_AGE in app.js
      └─ NO: Continue
      
2. Check MongoDB connection:
   └─ Is connect-mongo store connecting?
      ├─ Error in logs: "MongoStore connection failed"
      └─ YES: Fix MONGODB_URI in .env
      └─ NO: Continue
      
3. Check session data:
   ```
   mongosh
   use cinevillage
   db.sessions.find()  // Are sessions being saved?
   ```
   ├─ Documents appear? Continue
   └─ Empty: Store not working
   
4. Check cookie settings:
   └─ Is cookie being sent to browser?
      ├─ DevTools → Application → Cookies → connect.sid present?
      ├─ YES: Continue
      └─ NO: Check secure flag, sameSite setting
      
5. Check session warning timer:
   └─ Is setupSessionWarning() being called?
      ├─ Check console for errors
      └─ Set breakpoint in JavaScript debugger
         
6. Last resort:
   - Clear browser cookies
   - Clear MongoDB sessions collection
   - Restart server
   - Test login again
```

### B.20 Performance Optimization Checklist

```
SCREENING SCHEDULER (~1000+ screenings):

☐ Database indexes:
  - CREATE INDEX screenings(hallId, screeningDate)
  - CREATE INDEX screenings(movieId, status)
  
☐ Query optimization:
  - Use projection: Screening.find({}, { movieId: 1, hallId: 1 }) // exclude large arrays
  - Use limit when fetching lists
  - Aggregate rather than count+find
  
☐ Frontend optimization:
  - Lazy-load timeline grid (render visible slots only)
  - Virtual scrolling for large hall lists
  - Debounce search input (wait 300ms before filtering)
  
☐ Caching:
  - Cache movie list in browser localStorage
  - Redis for frequently-accessed data (future)
  
☐ N+1 Query Prevention:
  ✗ Bad: for(screenings) { fetchMovie(movieId) }  // N queries for movies
  ✓ Good: aggregate: [{ $lookup: 'movies' }]      // 1 query
```

---

## Conclusion

CineVillage demonstrates modern best practices for a three-tier web application:

- **Separation of Concerns**: Controllers, services, models each have one responsibility
- **Middleware Pattern**: Stackable, composable request processing
- **Type Safety (via Mongoose)**: Schema validation at the DB layer
- **Secure Practices**: bcrypt hashing, session persistence, CSRF tokens (potential addition)
- **User Experience**: Real-time search, drag-drop UI, flash messages
- **Scalability Foundation**: Service layer easily testable and refactorable

The newly added **movie search feature** exemplifies progressive enhancement:
- Works without JavaScript (form submission fallback could be added)
- Responsive to user input (instant filtering)
- Integrates seamlessly with existing drag-drop system
- Zero database queries (client-side filtering)

**Next Learning Steps**:
1. Add unit tests (Jest for services, Mocha for integration)
2. Implement API rate limiting (express-rate-limit)
3. Add logging (Morgan, Winston)
4. Deploy to production (environment-specific configs)
5. Add WebSocket support for real-time updates (Socket.IO)

