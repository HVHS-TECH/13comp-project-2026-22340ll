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
let oppClass = ''; //hey boy i just bought the brand new iphone it even has an app to destroy all opps watch
let playerReady = false;
let oppReady = false;

console.log("Authenticate");


import { fb_initialise, fb_authChanged }
    from '../../../fb_io.mjs'; // import

function setup() {
    createCanvas(WindowWidth, WindowHight);

    // Initialize Firebase  
    fb_initialise().then(() => { //Authenticate. THEN define it. FAT arrow. FAT.
        console.log('Firebase initialized');
        setupUI();
        checkAuthState();
    });

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

    classImages = { // Map classes to images
        'Spartan': imgSpartan,
        'Wizard': imgWizard,
        'Paladin': imgPaladin,
        'Barbarian': imgBarbarian,
        'Cleric': imgCleric,
        'default': imgPlaceholder
    };
}

/*************************************************************/
//start of code
/*************************************************************/
function BbB_checkGames() {
    console.log("still waiting")

}

function setupUI() {
    // Game creation UI
    createGameButton = createButton('Create New Game');
    createGameButton.position(20, 70);
    createGameButton.mousePressed(createNewGame);
    createGameButton.hide();

    joinGameButton = createButton('Join Game');
    joinGameButton.position(20, 90);
    joinGameButton.mousePressed(joinGame);
    joinGameButton.hide();

}

async function handleLogin() {
    try {
        const user = await fb_signInWithGoogle();
        console.log('Logged in:', user);
    } catch (error) {
        statusMessage = 'Login failed: ' + error.message;
    }
}

async function handleLogout() { //see its diffrent becuase its diffrent
    try {
        await fb_signOut();
        console.log('Logged out');
    } catch (error) {
        statusMessage = 'Logout failed: ' + error.message;
    }
}

function checkAuthState() {
    fb_onAuthStateChanged(async (user) => {
        if (user) {
            isAuthenticated = true;
            userID = user.uid;
            
            // Check admin status
            isAdmin = await fb_checkAdminStatus(user.uid);

        }
    });
}