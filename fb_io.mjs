import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

import { 
    getDatabase,
    ref,
    set,
    get,
    query,
    orderByChild,
    limitToLast,
    remove
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

  const firebaseConfig = {
    apiKey: "AIzaSyAWFMXdbKAkUGCzsrge1XvQzWG_FPWBXbI",
    authDomain: "comp-2026-leon-lim.firebaseapp.com",
    databaseURL: "https://comp-2026-leon-lim-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "comp-2026-leon-lim",
    storageBucket: "comp-2026-leon-lim.firebasestorage.app",
    messagingSenderId: "1092074281505",
    appId: "1:1092074281505:web:4dc7d8eaf21fb278eea160",
    measurementId: "G-12JTLL44XH"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

// Audio Context
let audioContext;

/**
 * Initializes Firebase and AudioContext
 * @returns {Promise<FirebaseApp>} Initialized Firebase app
 */
async function fb_initialise() {
    try {
        // Do NOT create AudioContext here — defer until user gesture.
        // Audio will be created lazily by fb_resumeAudio() when the user interacts.
        return app;
    } catch (e) {
        console.error("Initialization error:", e);
        throw e;
    }
}

// Authentication Functions

/**
 * Signs in with Google using popup
 * @returns {Promise<User>} Firebase user object
 */
async function fb_signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Google sign-in failed:", error);
        throw new Error("Google sign-in failed. Please try again.");
    }
}

/**
 * Wrapper for auth state changes
 * @param {function} callback - Callback function
 * @returns {function} Unsubscribe function
 */
function fb_onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, (user) => {
        try {
            callback(user);
        } catch (error) {
            console.error("Auth state callback error:", error);
        }
    });
}

/**
 * Signs out the current user
 * @returns {Promise<boolean>} True if successful
 */
async function fb_signOut() {
    try {
        await signOut(auth);
        return true;
    } catch (error) {
        console.error("Sign out failed:", error);
        throw new Error("Failed to sign out. Please try again.");
    }
}

// User Data Functions

/**
 * Writes user data to database
 * @param {string} userId - User ID
 * @param {string} name - User name
 * @param {string} email - User email
 * @param {object} additionalData - Additional user data
 * @returns {Promise<boolean>} True if successful
 */
async function fb_writeUserData(userId, name, email, additionalData = {}) {
    try {
        await set(ref(database, 'users/' + userId), {
            username: name,
            email: email,
            ...additionalData,
            lastUpdated: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Failed to write user data:", error);
        throw new Error("Failed to s@ve user data.");
    }
}

/**
 * Gets user data from database
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User data or null if not found
 */
async function fb_getUserData(userId) {
    try {
        const snapshot = await get(ref(database, 'users/' + userId));
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("Failed to get user data:", error);
        throw new Error("Failed to retrieve user data.");
    }
}

/**
 * Checks if user exists in database
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user exists
 */
async function fb_checkUserExists(userId) {
    try {
        const snapshot = await get(ref(database, 'users/' + userId));
        return snapshot.exists();
    } catch (error) {
        console.error("Failed to check user existence:", error);
        throw error;
    }
}

// Admin Functions

/**
 * Checks if user is admin by verifying their UID exists in uidAdmin node
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} True if user is admin
 */
async function fb_checkAdminStatus(userId) {
    try {
        if (!userId) return false;
        
        const snapshot = await get(ref(database, 'uidAdmin/' + userId));
        return snapshot.exists();
    } catch (error) {
        console.error("Admin check error:", error);
        // Fail safely - assume not admin if there's an error
        return false;
    }
}

/**
 * Enhanced auth state listener with better error handling
 */
function fb_authChanged() {
    return onAuthStateChanged(auth, async (user) => {
        try {
            if (user) {
                console.log('User signed in:', user.uid);
                sessionStorage.setItem('userEmail', user.email || '');
                
                try {
                    const isAdmin = await fb_checkAdminStatus(user.uid);
                    sessionStorage.setItem('isAdmin', isAdmin ? 'y' : 'n');
                    
                    if (isAdmin) {
                        console.log('Admin user detected');
                    }
                } catch (adminError) {
                    console.warn('Admin check failed, proceeding as non-admin', adminError);
                    sessionStorage.setItem('isAdmin', 'n');
                }
            } else {
                console.log('User signed out');
                sessionStorage.removeItem('userEmail');
                sessionStorage.removeItem('isAdmin');
            }
        } catch (error) {
            console.error('Auth state error:', error);
            // Don't block auth flow on admin check errors
            sessionStorage.setItem('isAdmin', 'n');
        }
    });
}

/**
 * Sets admin status for user by adding/removing from uidAdmin node
 * @param {string} userId - User ID to modify
 * @param {boolean} isAdmin - Whether user should be admin
 * @returns {Promise<boolean>} True if successful
 */
async function fb_setAdminStatus(userId, isAdmin) {
    try {
        if (isAdmin) {
            await set(ref(database, 'uidAdmin/' + userId), true);
        } else {
            await remove(ref(database, 'uidAdmin/' + userId));
        }
        return true;
    } catch (error) {
        console.error("Failed to set admin status:", error);
        throw new Error("Failed to update admin status.");
    }
}

// Game Score Functions

/**
 * Writes game score to database
 * @param {string} gameName - Name of the game
 * @param {number} score - Player's score
 * @returns {Promise<boolean>} True if successful
 */
async function fb_writeGameScore(gameName, score) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        
        const scoreData = {
            score: parseInt(score),
            timestamp: new Date().toISOString(),
            playerName: user.displayName || "Anonymous",
            uid: user.uid,
            email: user.email
        };
        
        await set(ref(database, `gameScores/${gameName}/${user.uid}`), scoreData);
        return true;
    } catch (error) {
        console.error("Failed to save score:", error);
        throw new Error("Failed to save your score. Please try again.");
    }
}

/**
 * Gets high scores for a game
 * @param {string} gameName - Name of the game
 * @param {number} limit - Maximum number of scores to return
 * @returns {Promise<Array>} Array of score objects
 */
async function fb_getHighScores(gameName, limit = 10) {
    try {
        const scoresRef = ref(database, `gameScores/${gameName}`);
        const snapshot = await get(query(
            scoresRef, 
            orderByChild('score'), 
            limitToLast(limit)
        ));
        
        if (!snapshot.exists()) return [];
        
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        return scores.sort((a, b) => b.score - a.score);
    } catch (error) {
        console.error("Failed to get scores:", error);
        throw new Error("Failed to retrieve high scores.");
    }
}

// Audio Control Functions

/**
 * Resumes (or creates) the AudioContext after a user gesture.
 * Creates the AudioContext lazily so browsers won't block it on page load.
 * @returns {Promise<boolean>} True if audio was created/resumed
 */
async function fb_resumeAudio() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext created (deferred)");
        }
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log("AudioContext resumed");
            return true;
        }
        return false;
    } catch (e) {
        console.error("Failed to resume/create audio:", e);
        return false;
    }
}

// Admin Management Functions

/**
 * Gets all users from database
 * @returns {Promise<Array>} Array of user objects
 */
async function fb_getAllUsers() {
    try {
        const snapshot = await get(ref(database, 'users'));
        if (!snapshot.exists()) return [];
        
        const users = [];
        snapshot.forEach((childSnapshot) => {
            users.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        return users;
    } catch (error) {
        console.error("Failed to get users:", error);
        throw new Error("Failed to retrieve user list.");
    }
}

/**
 * Gets all game scores from database
 * @returns {Promise<Array>} Array of score objects
 */
async function fb_getAllGameScores() {
    try {
        const snapshot = await get(ref(database, 'gameScores'));
        if (!snapshot.exists()) return [];
        
        const scores = [];
        snapshot.forEach((gameSnapshot) => {
            gameSnapshot.forEach((userSnapshot) => {
                scores.push({
                    game: gameSnapshot.key,
                    userId: userSnapshot.key,
                    ...userSnapshot.val()
                });
            });
        });
        return scores;
    } catch (error) {
        console.error("Failed to get all scores:", error);
        throw new Error("Failed to retrieve score data.");
    }
}

/**
 * Deletes a user from database
 * @param {string} uid - User ID to delete
 * @returns {Promise<boolean>} True if successful
 */
async function fb_deleteUser(uid) {
    try {
        await remove(ref(database, `users/${uid}`));
        return true;
    } catch (error) {
        console.error("Failed to delete user:", error);
        throw new Error("Failed to delete user.");
    }
}

/**
 * Deletes a score from database
 * @param {string} game - Game name
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} True if successful
 */
async function fb_deleteScore(game, uid) {
    try {
        await remove(ref(database, `gameScores/${game}/${uid}`));
        return true;
    } catch (error) {
        console.error("Failed to delete score:", error);
        throw new Error("Failed to delete score.");
    }
}


export {
    fb_initialise,
    fb_signInWithGoogle,
    fb_onAuthStateChanged,
    fb_authChanged,
    fb_signOut,
    fb_writeUserData,
    fb_getUserData,
    fb_checkUserExists,
    fb_checkAdminStatus,
    fb_setAdminStatus,
    fb_writeGameScore,
    fb_getHighScores,
    fb_resumeAudio,
    fb_getAllUsers,
    fb_getAllGameScores,
    fb_deleteUser,
    fb_deleteScore,
    auth,
    audioContext
};