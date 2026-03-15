Name: Xiang Pengyuan
Student Number: A0307548X

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
1. Dynamic screening scheduler
   - Allows admins to schedule drag and drop to schedule screenings. 

2. Hall seat-configuration matrix tool
   - Allows admins to configure hall seating layout.

3. Movie poster upload support
   - Uses Multer to upload and store posters under public/uploads/posters.

4. Session-based authentication with route protection
   - Secures admin routes and stores sessions in MongoDB.

5. Movie search Features
   - Allows admins to search through movies to schedule 

6. Scheduled Movie seating
   - Each scheduled movie creates a copy of the hall layout and admins are able to check which seats are filled

7. Hall seat markings with seat types
   - Supports multiple seat types and clearing of non-seat areas when creating or editing the hall seating arrangment

8. Schedule time and overlap check
   - Scheduler checks that you can only schedule movies in the future and when not overlapping other schedules

9. Movie release date
   - Scheduler checks movie release date to only schedule available movies

10. vscode settings
   - Vscode settings to not flag the ejs <- > as an error and many other ejs syntax