Name: NUS-Penguin
Student Number: E1397988

Database Details:
- Database: MongoDB
- ODM: Mongoose
- Session Store: connect-mongo (stores sessions in MongoDB)
- Required environment variable:
  MONGODB_URI=mongodb://localhost:27017/cinevillage

Instructions for Deploying the Project:
1. Prerequisites:
   - Node.js v16 or above
   - MongoDB running locally or a MongoDB Atlas connection string

2. Install dependencies:
   npm install

3. Create a .env file in the project root with:
   PORT=3000
   MONGODB_URI=<your-mongodb-connection-string>
   SESSION_SECRET=<your-random-secret>
   NODE_ENV=development

4. Start the application:
   npm start

5. Access the application:
   http://localhost:3000

Extra Features Implemented:
1. Screening overlap detection
   - Prevents double-booking of the same hall time slot.

2. Hall seat-configuration matrix tool
   - Allows admins to configure hall seating layout.

3. Movie poster upload support
   - Uses Multer to upload and store posters under public/uploads/posters.

4. Dashboard analytics widgets
   - Shows aggregate operational stats and upcoming screenings.

5. Session-based authentication with route protection
   - Secures admin routes and stores sessions in MongoDB.
