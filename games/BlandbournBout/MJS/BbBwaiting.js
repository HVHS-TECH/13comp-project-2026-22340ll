/*************************************************************
-BbBwaiting.js
-Loading screen until somebody joins
-
/*************************************************************/



import { fb_initialize, fb_authChanged } 
  from '../../../fb_io.mjs'; // import

function setup() {
    // Initialize Firebase  
    fb_initialize();
    // Listen for auth state changes
    fb_authChanged(user => {
        if (user) {
            console.log('User signed in:', user);
            // theres a user
        } else {
            console.log('No user signed in');
            // theres no user
        }
    });
  
}