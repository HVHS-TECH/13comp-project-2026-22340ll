/*************************************************************
  -BbBlobby.js 
  -Blandbourn Bout lobby
  -Waiting room for players to join before starting the game.
  -

/*************************************************************/
// -Setup
let userID, uidClass, gameID, gameNumber; // Making these exist
//let player1, player2, gameTurn; //So far, these dont do anything and will break 
// smthn if i remove the slash now
let playerClass = '';
let oppClass = '';
let playerReady = false;
let oppReady = false;

console.log("Authenticate");  


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
    BbB_checkGames()
    BbB_checkScores();
  
}

function preload() { //Preload everyting for further purposes.
    imgPlaceholder = loadImage('../other/image.jpg'); //placeholder
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to sony and playstation
    imgWizard = loadImage('../other/image.jpg'); // unit "-" doesn't actually exist. just put still until i make sprites.
    imgPalidin = loadImage('../other/image.jpg');
    imgBardarian = loadImage('../other/image.jpg');
    imgCleric = loadImage('../other/image.jpg');
}
/*************************************************************/
//start of code
/*************************************************************/
function BbB_checkGames(){
    console.log("still waiting")
    
}
