/**************************************************************/
// main.mjs
// Main entry for index.html
// Written by Leon Lim, Term 1-2 2026
/**************************************************************/
const COL_C = 'white';      // These two const are part of the coloured     
const COL_B = '#CD7F32';    //  console.log for functions scheme
console.log('%c main.mjs', 
    'color: blue; background-color: white;');

/**************************************************************/
// Import all external constants & functions required
/**************************************************************/
// Import all the constants & functions required from fb_io module
import { fb_initialise, fb_signInWithGoogle, fb_onAuthStateChanged }
    from './fb_io.mjs';
    
// Make available to window for HTML buttons
window.fb_initialise = fb_initialise;
window.fb_signInWithGoogle = fb_signInWithGoogle;
window.fb_onAuthStateChanged = fb_onAuthStateChanged;

/**************************************************************/
//   END OF CODE
/**************************************************************/