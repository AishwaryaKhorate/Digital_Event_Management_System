const admin = require('firebase-admin');
const path = require('path');

// Load .env from the root directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// FIX: Manually convert literal '\n' strings into actual newline characters
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

if (!privateKey) {
    console.error("❌ Error: FIREBASE_PRIVATE_KEY is missing from .env");
    process.exit(1);
}

// Initialize the Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey, // Now contains real newlines
  }),
});

const ADMIN_UID = 'Gf9iWH2NTEWM8AuUIvvAE73FqfF3'; 

async function setCustomClaims() {
    try {
        console.log('⏳ Setting admin claims...');
        await admin.auth().setCustomUserClaims(ADMIN_UID, { role: 'admin' });
        
        console.log(`✅ Success! Custom claims set for user: ${ADMIN_UID}`);

        // Verification
        const user = await admin.auth().getUser(ADMIN_UID);
        console.log('Verified Claims:', user.customClaims);
    } catch (error) {
        console.error('❌ Error details:', error.message);
    }
    process.exit();
}

setCustomClaims();