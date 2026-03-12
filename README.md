# CineVillage Admin Portal

Internal Admin Portal for CineVillage cinema chain management.

## Project Overview

This is a server-rendered ExpressJS application for managing cinema operations including:
- Cinema hall management
- Movie listings
- Screening schedules
- Operational dashboard

## Technology Stack

- **Backend Framework:** ExpressJS
- **Templating Engine:** EJS
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** express-session with connect-mongo
- **Password Security:** bcrypt
- **Styling:** Bootstrap 5

## Project Structure

```
cinevillage-admin/
├── app.js                      # Application entry point
├── config/                     # Configuration files
├── models/                     # Mongoose schemas and models
├── controllers/                # Request handlers (thin layer)
├── routes/                     # Route definitions
├── middleware/                 # Reusable middleware functions
├── services/                   # Business logic layer
├── utils/                      # Helper functions
├── views/                      # EJS templates
└── public/                     # Static assets
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Assignment-1
```

2. Install dependencies
```bash
npm install
```

3. Create .env file
```bash
# Copy .env.example to .env and configure
cp .env.example .env
```

4. Configure environment variables in .env:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cinevillage
SESSION_SECRET=your-secure-random-secret-here
NODE_ENV=development
```

5. Start the application
```bash
npm start
```

6. Access the application
```
http://localhost:3000
```

## Development

```bash
# Run in development mode with nodemon
npm run dev
```

## Architecture

This application follows the MVC (Model-View-Controller) pattern with an additional service layer:

- **Models:** Data structure and database operations
- **Views:** EJS templates for UI rendering
- **Controllers:** HTTP request/response handling (thin layer)
- **Services:** Business logic and complex operations
- **Middleware:** Reusable functions for authentication, validation, error handling

## Key Features

### Authentication
- Session-based authentication
- Bcrypt password hashing
- Protected admin routes

### Hall Management
- CRUD operations for cinema halls
- Hall status management (active/maintenance)
- Seat configuration

### Movie Management
- Full CRUD operations
- Movie cannot be deleted if future screenings exist

### Screening Scheduling
- Create and manage movie screenings
- **Critical:** Overlap detection prevents double-booking halls
- Validation for hall availability and status

### Dashboard
- Real-time statistics
- Upcoming screenings overview
- Quick actions for common tasks

## Security Features

- Password hashing with bcrypt (saltRounds: 10)
- Session-based authentication with MongoDB session store
- HTTP-only cookies for session security
- Input validation at multiple layers
- Centralized error handling

## API Routes

### Authentication
- GET `/login` - Login page
- POST `/login` - Authenticate user
- POST `/logout` - End session

### Admin Routes (Protected)
- GET `/admin/dashboard` - Dashboard
- GET `/admin/halls` - List halls
- GET `/admin/movies` - List movies
- GET `/admin/screenings` - List screenings

## License

This project is for educational purposes as part of IS3108 coursework.

## Author

IS3108 Student Assignment
