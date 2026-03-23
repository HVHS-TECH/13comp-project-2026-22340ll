/*************************************************************
  -BbBlobby.js 
  -Blandbourn Bout lobby
  -Waiting room for players to join before starting the game.
  -

/*************************************************************/
// -Setup
let userID, uidClass, gameID, gameNumber; // Making these exist
let player1, player2, gameTurn; //(So far, these dont do anything and will break 
// smthn if i remove the slash now)
let playerClass = null;
let oppClass = null; //hey boy i just bought the brand new iphone it even has an app to destroy all opps watch
let playerReady = false;
let oppReady = false;

console.log("Authenticate Please");

import {
    fb_initialise,
    fb_signInWithGoogle,
    fb_onAuthStateChanged,
    fb_authChanged,
    fb_signOut,
    fb_writeUserData,
    fb_getUserData,
    fb_checkUserExists,
    fb_checkAdminStatus,
    fb_writeGameScore,
    fb_getHighScores,
    fb_resumeAudio,
    fb_getAllUsers,
    fb_getAllGameScores,
    fb_deleteUser,
    fb_deleteScore,
    auth,
} from '../../../fb_io.mjs';

function setup() {
    createCanvas(windowWidth, windowHeight);

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
    imgPlaceholder = loadImage('../other/images.jpg'); //placeholder
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to Sony and Playstation. Also using Kratos as the spartan just seems funny to me.
    imgWizard = loadImage('../other/image.jpg');
    imgPaladin = loadImage('../other/image.jpg');
    imgBardarian = loadImage('../other/image.jpg');
    imgCleric = loadImage('../other/image.jpg');

    classImages = { // Map classes to images
        'Spartan': imgSpartan,
        'Wizard': imgWizard,
        'Paladin': imgPaladin,
        'Barbarian': imgBardarian,
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

    gameCodeInput = createInput('');
    gameCodeInput.position(20, 150);
    gameCodeInput.attribute('placeholder', 'Enter Game Code');
    gameCodeInput.hide();

    refreshButton = createButton('Refresh Games');
    refreshButton.position(280, 70);
    refreshButton.mousePressed(refreshAvailableGames);
    refreshButton.hide();

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

async function createNewGame() {
    if (!isAuthenticated || !auth.currentUser) {
        statusMessage = 'Please login first';
        return;
    }

    const username = usernameInput.value() || auth.currentUser.displayName || 'Player';

    // Generate random game ID
    gameID = Math.random().toString(36).substring(2, 8).toUpperCase();
    gameNumber = Date.now();

    // Create game in Firebase
    const gameRef = ref(database, `BbB/games/${gameID}`);
    await set(gameRef, {
        gameId: gameID,
        gameNumber: gameNumber,
        status: 'waiting',
        createdBy: userID,
        createdAt: new Date().toISOString(),
        players: {
            [userID]: {
                uid: userID,
                username: username,
                ready: false,
                class: '',
                health: 100
            }
        },
        gameOn: false,
        turn: userID,
        dmg: 0
    });

    statusMessage = `Game created! Code: ${gameID}`;
    startGameListener(gameID);
    
    // Redirect to waiting page
    window.location.href = '../HTML/BbBwaiting.html';
}

async function joinGame() {
    if (!isAuthenticated) {
        statusMessage = 'Please login first';
        return;
    }

    const gameCode = gameCodeInput.value().toUpperCase();
    if (!gameCode) {
        statusMessage = 'Please enter a game code';
        return;
    }

    try {
        const gameRef = ref(database, `BbB/games/${gameCode}`);
        const gameSnapshot = await get(gameRef);

        if (!gameSnapshot.exists()) {
            statusMessage = 'Game not found';
            return;
        }

        const username = usernameInput.value() || auth.currentUser.displayName || 'Player';
        gameID = gameCode;

        // Add player to game
        await set(ref(database, `BbB/games/${gameCode}/players/${userID}`), {
            uid: userID,
            username: username,
            ready: false,
            class: null,
            health: 100
        });

        statusMessage = `Joined game: ${gameCode}`;
        
        // Redirect to waiting page
        window.location.href = '../HTML/BbBwaiting.html';
    } catch (error) {
        statusMessage = 'Error joining game: ' + error.message;
    }
}


//this is how the classes are sorted. I'm hoping that it will randomized every game to prevent total class maining.
async function assignRandomClasses(gameId, playerIds) {
    const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];

    const gameRef = ref(database, `BbB/games/${gameId}/players`);

    for (let i = 0; i < playerIds.length; i++) {
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        await set(ref(database, `BbB/games/${gameId}/players/${playerIds[i]}/class`), randomClass);
    }
}

async function toggleReady() {
    if (!gameID || !userID) return;
    // Check if player is in the game
    const newReadyState = !playerReady;
    await set(ref(database, `BbB/games/${gameID}/players/${userID}/ready`), newReadyState);
}

async function startGame(gameId, gameData) {
    // Set game to active
    await set(ref(database, `BbB/games/${gameId}/gameOn`), true);
    await set(ref(database, `BbB/games/${gameId}/status`), 'active');
    statusMessage = 'Game starting soon!';
}

function draw() {
    background(220);
    //Make title
    fill(50);
    textSize(32);
    textAlign(CENTER, TOP);
    text('Blandbourn Bout', width / 2, 60);
    //Make status message
    if (statusMessage) {
        fill(0);
        textSize(16);
        text(statusMessage, width / 2, 100);
    }
    if (isAuthenticated) {
        drawLobby();
    } else {
        drawLoginPrompt();
    }
}

function drawLoginPrompt() {
    fill(100);
    textSize(20);
    textAlign(CENTER);
    text('Please login to continue. Seriously. do it.', width / 2, height / 2);
}

function drawLobby() {
    // Draw current game info if in a game
    if (gameID) {
        drawGameLobby();
    } else {
        drawAvailableGames();
    }

    // Draw userID info
    fill(0);
    textSize(14);
    textAlign(LEFT);
    text(`Logged in as: ${auth.currentUser?.displayName || 'User'}`, 20, height - 40);
    if (isAdmin) {
        text('(Admin)', 20, height - 20);
    }
}

