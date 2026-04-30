/*************************************************************
  -BbBlobby.js 
  -Blandbourn Bout lobby
  -Waiting room for players to join before starting the game.
  -

/*************************************************************/
// -Setup
let userID, uidClass, gameID, gameNumber; // Making these exist
let player1, player2, gameTurn;
let playerClass = '';
let oppClass = '';
let playerReady = false;
let oppReady = false;
let waitingForOpponent = false;
// Initialize availableGames as an empty array
let availableGames = [];
// Declare image variables
let imgPlaceholder, imgSpartan, imgWizard, imgPaladin, imgBarbarian, imgCleric, classImages;
// Declare UI variables
let loginButton, LogoutButton, getoutButton, createGameButton, joinGameButton, gameCodeInput, refreshButton, usernameInput;
let gameActionButton;
// Declare other variables
let statusMessage, isAuthenticated, isAdmin;
let currentPlayer, opponentPlayer, gameInterval, lobbyListener;

console.log("Authenticate Please");

import {
    fb_initialise,
    fb_signInWithGoogle,
    fb_onAuthStateChanged,
    fb_authChanged,
    fb_signOut,
    fb_checkAdminStatus,
    auth,
    database,
    ref,
    set,
    get,
    onValue,
    update
} from '../../../fb_io.mjs';

function setup() {
    createCanvas(windowWidth, windowHeight);

    // Check if coming from redirect
    const savedGameID = sessionStorage.getItem('gameID');
    if (savedGameID && window.location.pathname.includes('BbBlobby.html')) {
        gameID = savedGameID;
        waitingForOpponent = true;
        startGameListener(savedGameID);
    }

    // Initialize Firebase  
    fb_initialise().then(() => {
        console.log('Firebase initialized');
        setupUI();
        checkAuthState();
    });
}

function preload() { //Preload everyting for further purposes.
    imgPlaceholder = loadImage('../other/images.jpg'); //placeholder
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to Sony and Playstation. Also using Kratos as the spartan just seems funny to me.
    imgWizard = loadImage('../other/BbBWiz.png');
    imgPaladin = loadImage('../other/BbBPal.png');
    imgBarbarian = loadImage('../other/BbBBarb.png');
    imgCleric = loadImage('../other/BbBCler.png');

    classImages = { // Map classes to images
        'Spartan': imgSpartan,
        'Wizard': imgWizard,
        'Paladin': imgPaladin,
        'Barbarian': imgBarbarian,
        'Cleric': imgCleric,
        'default': imgPlaceholder
    };
}

function startLobbyListener() {
    //Listen to gameScore/BbB path
    const gamesRef = ref(database, 'gameScore/BbB');
    lobbyListener = onValue(gamesRef, (snapshot) => {
        if (snapshot.exists()) {
            availableGames = [];
            snapshot.forEach((childSnapshot) => {
                const game = childSnapshot.val();
                // Check for waiting games
                if (game.uid1 && (!game.uid2 || game.uid2 === "") && !game.gameOn) {
                    availableGames.push({
                        gameID: childSnapshot.key,
                        uid1: game.uid1,
                        Wait: game.Wait || ""
                    });
                }
            });
        }
    });
}

function startGameListener(gameId) {
    const gameRef = ref(database, `gameScore/BbB/Wait/${gameId}`);
    if (gameInterval) {
        gameInterval(); // Clean up previous listener
    }
    gameInterval = onValue(gameRef, (snapshot) => {
        if (!snapshot.exists()) {
            statusMessage = 'Game no longer exists';
            gameID = null;
            waitingForOpponent = false;
            return;
        }

        const gameData = snapshot.val();

        // Check if both players are in and game is ready to start
        if (gameData.uid1 && gameData.uid2 && gameData.uid2 !== "" && !gameData.gameOn) {
            // Both players joined, start the game
            update(ref(database, `gameScore/BbB/${gameId}`), {
                gameOn: true
            });

            statusMessage = 'Both players joined! Starting game...';

        }
    });
}

function updateUIForAuth(loggedIn) {
    if (loggedIn) {
        loginButton.hide();
        LogoutButton.show();
        getoutButton.show();
        createGameButton.show();
        joinGameButton.show();
        usernameInput.show();
        gameCodeInput.show();
        refreshButton.show();

        // Show game action button if in a game
        if (gameID) {
            gameActionButton.show();
        }

        // Set username if available
        if (auth.currentUser) {
            usernameInput.value(auth.currentUser.displayName || '');
        }
    } else {
        loginButton.show();
        LogoutButton.hide();
        getoutButton.hide();
        createGameButton.hide();
        joinGameButton.hide();
        usernameInput.hide();
        gameCodeInput.hide();
        refreshButton.hide();
        gameActionButton.hide();
    }
}

async function handleLogin() { //Check weather sombody has logged in or not
    try {
        const user = await fb_signInWithGoogle();
        console.log('Logged in:', user);
    } catch (error) {
        statusMessage = 'Login failed: ' + error.message;
    }
}

async function handleLogout() { //Viceversa, but with logout
    try {
        await fb_signOut();
        console.log('Logged out');
    } catch (error) {
        statusMessage = 'Logout failed: ' + error.message;
    }
}

function handleExitToSelection() {
    window.location.href = '../../../startscreen.html';
}

function setupUI() {
    // Login UI
    loginButton = createButton('Login with Google');
    loginButton.position(20, 20);
    loginButton.mousePressed(handleLogin);

    LogoutButton = createButton('Logout');
    LogoutButton.position(150, 20);
    LogoutButton.mousePressed(handleLogout);
    LogoutButton.hide();

    getoutButton = createButton('Exit to Start Screen');
    getoutButton.position(300, 20);
    getoutButton.mousePressed(handleExitToSelection);
    getoutButton.hide();

    // Username input
    usernameInput = createInput('');
    usernameInput.position(20, 70);
    usernameInput.attribute('placeholder', 'Enter Username');
    usernameInput.hide();

    // Game creation UI
    createGameButton = createButton('Create New Game');
    createGameButton.position(20, 110);
    createGameButton.mousePressed(createNewGame);
    createGameButton.hide();

    joinGameButton = createButton('Join Game');
    joinGameButton.position(150, 110);
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

    // Combined Cancel/Leave Game and Change Class button
    gameActionButton = createButton('Game Actions ▾');
    gameActionButton.position(20, 190);
    gameActionButton.mousePressed(showGameActionsMenu);
    gameActionButton.hide();
}

// Fetch available games from the database and update availableGames array
async function refreshAvailableGames() {
    if (!isAuthenticated) return;

    try {
        // Use correct path gameScore/BbB
        const gamesRef = ref(database, 'gameScore/BbB');
        const snapshot = await get(gamesRef);

        if (snapshot.exists()) {
            availableGames = [];
            snapshot.forEach((childSnapshot) => {
                const game = childSnapshot.val();
                // Check for waiting games (has uid1 but no uid2, and game not active)
                if (game.uid1 && (!game.uid2 || game.uid2 === "") && !game.gameOn) {
                    availableGames.push({
                        gameID: childSnapshot.key,
                        uid1: game.uid1,
                        Wait: game.Wait || ""
                    });
                }
            });
        } else {
            availableGames = [];
        }

        statusMessage = `Found ${availableGames.length} available games`;
    } catch (error) {
        console.error('Error fetching games:', error);
        statusMessage = 'Error refreshing games';
    }
}

function checkAuthState() {
    fb_onAuthStateChanged(async (user) => {
        if (user) {
            isAuthenticated = true;
            userID = user.uid;
            isAdmin = await fb_checkAdminStatus(user.uid);
            updateUIForAuth(true);
            startLobbyListener();
        } else {
            isAuthenticated = false;
            userID = null;
            isAdmin = false;
            updateUIForAuth(false);
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

    // Get random class
    const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    playerClass = randomClass;

    // Create game in Firebase - MATCH YOUR STRUCTURE
    const gameRef = ref(database, `gameScore/BbB/Wait/${gameID}`);
    await set(gameRef, {
        gameID: gameID,
        uid1: userID,
        uid2: "",
        Wait: "",
        gameOn: false,
        turn: userID,
        DMG: 0
    });

    // Store player info in separate node or in users
    await set(ref(database, `users/${userID}/currentGame`), gameID);
    await set(ref(database, `users/${userID}/currentClass`), randomClass);

    // Store game state in sessionStorage for waiting page
    sessionStorage.setItem('gameID', gameID);
    sessionStorage.setItem('playerClass', randomClass);
    sessionStorage.setItem('isHost', 'true');

    // Show game action button
    gameActionButton.show();

    statusMessage = `Game created! Code: ${gameID}`;

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
        // Check if game exists
        const gameRef = ref(database, `gameScore/BbB/${gameCode}`);
        const gameSnapshot = await get(gameRef);

        if (!gameSnapshot.exists()) {
            statusMessage = 'Game not found';
            return;
        }

        const gameData = gameSnapshot.val();

        // Check if game already has 2 players
        if (gameData.uid2 && gameData.uid2 !== "") {
            statusMessage = 'Game is full';
            return;
        }

        // Check if player is already in game
        if (gameData.uid1 === userID) {
            statusMessage = 'You are already in this game';
            sessionStorage.setItem('gameID', gameCode);

            return;
        }

        const username = usernameInput.value() || auth.currentUser.displayName || 'Player';

        // Get random class for joining player
        const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];
        const randomClass = classes[Math.floor(Math.random() * classes.length)];

        // Add player to game
        await update(ref(database, `gameScore/BbB/Wait/${gameCode}`), {
            uid2: userID,
            Wait: username
        });

        // Store player info
        await set(ref(database, `users/${userID}/currentGame`), gameCode);
        await set(ref(database, `users/${userID}/currentClass`), randomClass);
        await set(ref(database, `users/${userID}/playerName`), username);

        // Store in sessionStorage for waiting page
        sessionStorage.setItem('gameID', gameCode);
        sessionStorage.setItem('playerClass', randomClass);
        sessionStorage.setItem('isHost', 'false');

        // Show game action button
        gameActionButton.show();

        statusMessage = `Joined game: ${gameCode}`;



    } catch (error) {
        statusMessage = 'Error joining game: ' + error.message;
    }
}


// This is how the classes are sorted. I'm hoping that it will randomized every game to prevent total class maining.
async function assignRandomClasses(gameId, playerIds) {
    const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];

    const gameRef = ref(database, `gameScore/BbB/Wait/${gameId}/players`);

    for (let i = 0; i < playerIds.length; i++) {
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        await set(ref(database, `gameScore/BbB/Wait/${gameId}/players/${playerIds[i]}/class`), randomClass);
    }
}

async function toggleReady() {
    if (!gameID || !userID) return;
    // Check if player is in the game
    const newReadyState = !playerReady;
    await set(ref(database, `gameScore/BbB/Wait/${gameID}/players/${userID}/ready`), newReadyState);
}

async function startGame(gameId, gameData) {
    // Set game to active
    await set(ref(database, `gameScore/BbB/Wait/${gameId}/gameOn`), true);
    await set(ref(database, `gameScore/BbB/Wait/${gameId}/status`), 'active');
    statusMessage = 'Game starting soon!';
}

function draw() {
    background(220);
    //Make title
    fill(50);
    textSize(32);
    textAlign(CENTER, TOP);
    text('BLANDBOURN BOUT', width / 2, 60);
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

async function cancelGame() {
    if (!gameID || !userID) {
        statusMessage = 'You are not in a game';
        return;
    }

    try {
        // Get current game data
        const gameRef = ref(database, `gameScore/BbB/Wait/${gameID}`);
        const snapshot = await get(gameRef);

        if (!snapshot.exists()) {
            statusMessage = 'Game no longer exists';
            clearGameState();
            return;
        }

        const gameData = snapshot.val();

        // Check if player is host (uid1) or player 2
        if (gameData.uid1 === userID) {
            // Host is leaving, delete the entire game
            await set(gameRef, null);
            statusMessage = 'Game cancelled';
        } else if (gameData.uid2 === userID) {
            // Joiner is leaving, just remove uid2
            await update(gameRef, {
                uid2: '',
                Wait: ''
            });
            statusMessage = 'Left the game';
        }

        // Clear user's game state
        await set(ref(database, `users/${userID}/currentGame`), null);
        await set(ref(database, `users/${userID}/currentClass`), null);

        clearGameState();
    } catch (error) {
        statusMessage = 'Error cancelling game: ' + error.message;
    }
}

function clearGameState() {
    gameID = null;
    playerClass = '';
    oppClass = '';
    playerReady = false;
    oppReady = false;
    waitingForOpponent = false;
    sessionStorage.removeItem('gameID');
    sessionStorage.removeItem('playerClass');
    sessionStorage.removeItem('isHost');
    gameActionButton.hide();
}

async function changeClass() {
    if (!gameID || !userID) {
        statusMessage = 'You are not in a game';
        return;
    }

    const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];
    const currentIndex = classes.indexOf(playerClass);
    const newIndex = (currentIndex + 1) % classes.length;
    const newClass = classes[newIndex];

    // Use the new changeClassTo function
    await changeClassTo(newClass);
}

// Show game actions dropdown menu
function showGameActionsMenu() {
    if (!gameID || !userID) {
        statusMessage = 'You are not in a game';
        return;
    }

    // Create a simple dropdown using createSelect
    const menu = createSelect();
    menu.position(20, 220);
    menu.option('Select Action...', '');
    menu.option('Change Class', 'change');
    menu.option('Leave Game', 'leave');
    menu.changed(() => {
        const action = menu.value();
        if (action === 'change') {
            changeClass();
        } else if (action === 'leave') {
            cancelGame();
        }
        // Remove the menu after selection
        setTimeout(() => menu.remove(), 100);
    });
}

// Helper function to change class directly
async function changeClassTo(newClass) {
    if (!gameID || !userID) {
        statusMessage = 'You are not in a game';
        return;
    }

    try {
        // Update class in game
        const gameRef = ref(database, `gameScore/BbB/Wait/${gameID}`);
        const snapshot = await get(gameRef);

        if (!snapshot.exists()) {
            statusMessage = 'Game no longer exists';
            clearGameState();
            return;
        }

        const gameData = snapshot.val();

        // Update the correct player's class
        if (gameData.uid1 === userID) {
            await update(gameRef, { class1: newClass });
        } else if (gameData.uid2 === userID) {
            await update(gameRef, { class2: newClass });
        }

        // Update user's class in users node
        await set(ref(database, `users/${userID}/currentClass`), newClass);

        playerClass = newClass;
        sessionStorage.setItem('playerClass', newClass);
        statusMessage = `Class changed to ${newClass}`;
    } catch (error) {
        statusMessage = 'Error changing class: ' + error.message;
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

// Moved form BbBwaiting.js for testing
function drawGameLobby() {
    // Draw game header
    fill(50);
    textSize(24);
    textAlign(CENTER);
    text(`Game Code: ${gameID}`, width / 2, 200);

    // Draw players
    const player1X = width / 2 - 200;
    const player2X = width / 2 + 200;
    const playerY = 300;

    // Define currentPlayer and opponentPlayer for demo purposes
    const currentPlayer = auth.currentUser?.displayName || 'Player 1';
    const opponentPlayer = { username: 'Player 2' };

    // Player 1 (current player)
    drawPlayerBox(player1X, playerY, currentPlayer, playerClass, playerReady);
    // VS TEXT
    fill(100);
    textSize(32);
    text('VS', width / 2, playerY + 75);
    // Player 2 (opponent)
    drawPlayerBox(player2X, playerY, opponentPlayer, oppClass, oppReady);

    // Ready button if not ready
    if (!playerReady && opponentPlayer) {
        fill(0, 150, 0);
        rect(width / 2 - 60, 450, 120, 40);
        fill(255);
        textSize(18);
        textAlign(CENTER);
        text('Ready Up', width / 2, 450);
        if (mouseIsPressed && mouseX > width / 2 - 60 && mouseX < width / 2 + 60 && mouseY > 450 && mouseY < 490) {
            toggleReady();
        }
    }

    if (playerReady && oppReady) {
        fill(0, 150, 0);
        textSize(20);
        text('Both players ready! Starting game...', width / 2, 520);
    }
}

// MAKE PLAYER
function drawPlayerBox(x, y, player, className, ready) {
    // Draw player container
    stroke(0);
    strokeWeight(2);
    fill(ready ? 200 : 240);
    rect(x - 100, y - 50, 200, 250);
    // Draw class image
    const classImage = classImages[className] || classImages['default'];
    image(classImage, x - 75, y - 25, 150, 150);
    // Draw player info
    noStroke();
    fill(0);
    textSize(16);
    textAlign(CENTER);
    let displayName = (typeof player === 'object' && player !== null && 'username' in player)
        ? player.username
        : (typeof player === 'string' ? player : 'Waiting...');
    text(displayName, x, y + 140);
    if (className) {
        textSize(14);
        fill(100);
        text(className, x, y + 160);
    }
    // Ready indicator
    if (ready) {
        fill(0, 150, 0);
        text('Ready!', x, y + 180);
    }
}

//Create game list
function drawAvailableGames() {
    fill(50);
    textSize(20);
    textAlign(LEFT);
    text('Available Games:', 20, 200);

    let y = 240;
    availableGames.forEach((game, index) => {
        // Game box
        fill(240);
        stroke(0);
        rect(20, y - 15, 400, 40);

        // Show game info
        fill(0);
        textSize(16);
        let playerCount = game.uid1 ? 1 : 0;
        text(`Game ${game.gameID} - ${playerCount}/2 players`, 30, y + 10);

        // Join button
        fill(0, 100, 200);
        rect(350, y - 10, 60, 30);
        fill(255);
        textSize(14);
        text('Join', 380, y + 10);

        // Check click
        if (mouseIsPressed && mouseX > 350 && mouseX < 410 && mouseY > y - 10 && mouseY < y + 20) {
            gameCodeInput.value(game.gameID);
            joinGame();
        }
        y += 50;
    });
}

// Clean up Firebase listeners when leaving the page
function windowWillUnload() {
    if (lobbyListener) {
        lobbyListener(); // Clean up lobby listener
    }
    if (gameInterval) {
        gameInterval(); // Clean up game listener
    }
}

// Expose sketch functions to global scope for p5.js
window.setup = setup;
window.preload = preload;
window.draw = draw;

// Add event listener for cleanup on page unload
window.addEventListener('beforeunload', windowWillUnload);