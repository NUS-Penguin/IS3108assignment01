/**
 * scripts/seedAdmin.js - Create First Admin User
 *
 * One-time setup script to create the initial admin account.
 * Run once at startup: node scripts/seedAdmin.js
 *
 * IMPORTANT: Change the username, email, and password before running in production!
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@cinevillage.local';
const ADMIN_PASSWORD = 'SecurePassword123!'; // CHANGE THIS IN PRODUCTION

async function seedAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('📝 Creating initial admin user...');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ username: ADMIN_USERNAME });
        if (existingAdmin) {
            console.log('✅ Admin user already exists. No action needed.');
            console.log(`   Username: ${existingAdmin.username}`);
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);
            await mongoose.connection.close();
            process.exit(0);
        }

        // Create new admin
        const admin = new User({
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            passwordHash: ADMIN_PASSWORD,
            role: 'admin'
        });

        await admin.save();

        console.log('✅ Admin user created successfully!');
        console.log('🔐 Login credentials:');
        console.log(`   Username: ${ADMIN_USERNAME}`);
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');
        console.log('⚠️  IMPORTANT: Update the hardcoded credentials in this script for production!');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        process.exit(1);
    }
}

// Run the seed function
seedAdmin();
