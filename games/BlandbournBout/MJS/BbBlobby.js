/*************************************************************
  -BbBlobby.js 
  -Blandbourn Bout lobby
  -Waiting room for players to join before starting the game.
  -

/*************************************************************/

let userID; // Making these exist
let uidClass;
let gameID;
let gameNumber;

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

function preload() { //Preload everyting for further purposes.
    imgPlaceholder = loadImage('../other/image.jpg'); //placeholder
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to sony and playstation
    imgWizard = loadImage('../other/-'); // unit "-" doesn't actually exist. just put still until i make sprites.
    imgPalidin = loadImage('../other/-');
    imgBardarian = loadImage('../other/-');
    imgCleric = loadImage('../other/-');
}