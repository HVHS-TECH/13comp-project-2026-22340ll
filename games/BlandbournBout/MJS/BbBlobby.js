/*************************************************************
  -BbBlobby.js 
  -Blandbourn Bout lobby
  -Waiting room for players to join before starting the game.
  -FIXED: Join buttons work properly with mouseClicked()
  -Same visual appearance as original
/*************************************************************/

// -Setup
let userID, uidClass, gameID, gameNumber; // Making these exist
let player1, player2, gameTurn, playerClass = '', oppClass = '';
let playerReady = false, oppReady = false, waitingForOpponent = false;
// Initialize availableGames as an empty array
let availableGames = [];
// Declare image variables
let imgPlaceholder, imgSpartan, imgWizard, imgPaladin, imgBarbarian, imgCleric, classImages;
// Declare UI variables
let loginButton, getoutButton, createGameButton, joinGameButton, gameCodeInput;
let gameActionButton, usernameInput;
// Declare other variables
let statusMessage, isAuthenticated, isAdmin;
let currentPlayer, opponentPlayer, currentgameName = '', opponentgameName = '';
let currentUsername = '';
let currentGameData = null, gameInterval, lobbyListener;
let userTotalWins = 0;
let userHighestDamage = 0;
let userTotalDamage = 0;
let leaderboardData = [];
let lastLeaderboardFetch = 0;
const LEADERBOARD_REFRESH_INTERVAL = 30000; // Refresh every 30 seconds

console.log("Authenticate Please");

import {
    fb_initialise, fb_signInWithGoogle,
    fb_onAuthStateChanged, fb_authChanged,
    fb_signOut, fb_checkAdminStatus,
    auth, database, ref, set, get,
    onValue, update
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
    imgPlaceholder = loadImage('../other/images.jpg'); 
    imgSpartan = loadImage('../other/BbBSpar.png'); // Was origionally Kratos from GOW
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
    // Listen for waiting games only
    const gamesRef = ref(database, 'gameScore/BbB/Wait');
    lobbyListener = onValue(gamesRef, (snapshot) => {
        if (snapshot.exists()) {
            availableGames = [];
            snapshot.forEach((childSnapshot) => {
                const game = childSnapshot.val();
                if (game && game.uid1 && (!game.uid2 || game.uid2 === "") && game.gameOn !== true) {
                    availableGames.push({
                        gameID: childSnapshot.key,
                        uid1: game.uid1,
                        player1Name: game.player1Name || 'Anonymous',
                        class1: game.class1 || 'Unknown'
                    });
                }
            });
        } else {
            availableGames = [];
        }
    });
}

function startGameListener(gameId) {
    const gameRef = ref(database, `gameScore/BbB/Wait/${gameId}`);
    if (gameInterval) {
        gameInterval(); // Clean up previous listener
    }
    gameInterval = onValue(gameRef, async (snapshot) => {
        if (!snapshot.exists()) {
            statusMessage = 'Game no longer exists';
            console.log(`Game ${gameId} no longer exists`);
            clearGameState();
            return;
        }

        const gameData = snapshot.val();
        currentGameData = gameData;
        gameID = gameId;
        waitingForOpponent = true;
        // Hide create/join controls when arriving at a waiting game
        if (createGameButton) createGameButton.hide();
        if (joinGameButton) joinGameButton.hide();
        if (gameCodeInput) gameCodeInput.hide();

        if (auth.currentUser) {
            userID = auth.currentUser.uid;
        }

        if (gameData.uid1 === userID) {//player 1 ui
            currentgameName = gameData.player1Name || auth.currentUser?.displayName || 'Player 1';
            opponentgameName = gameData.player2Name || 'Waiting...';
            playerClass = gameData.class1 || playerClass;
            oppClass = gameData.class2 || oppClass;
        } else if (gameData.uid2 === userID) {//player 2 ui
            currentgameName = gameData.player2Name || auth.currentUser?.displayName || 'Player 2';
            opponentgameName = gameData.player1Name || 'Player 1';
            playerClass = gameData.class2 || playerClass;
            oppClass = gameData.class1 || oppClass;
        } else { //player2 left
            currentgameName = auth.currentUser?.displayName || 'Player 1';
            opponentgameName = gameData.player2Name || 'Waiting...';
            playerClass = gameData.class1 || playerClass;
            oppClass = gameData.class2 || oppClass;
        }

        updateReadyStates(gameData);

        const bothPlayersPresent = gameData.uid1 && gameData.uid2 && gameData.uid2 !== "";
        // Ensure players object exists; if not, create default entries
        if (bothPlayersPresent && !gameData.players) {
            const playersPayload = {};
            playersPayload[gameData.uid1] = {
                ready: false,
                class: gameData.class1 || playerClass,
                name: gameData.player1Name || 'Player 1'
            };
            playersPayload[gameData.uid2] = {
                ready: false,
                class: gameData.class2 || oppClass,
                name: gameData.player2Name || 'Player 2'
            };
            await update(ref(database, `gameScore/BbB/Wait/${gameId}`), {
                players: playersPayload
            });
        }

        // Start the game only when both players have marked ready
        const playersObj = gameData.players || {};
        const bothReady = bothPlayersPresent && playersObj[gameData.uid1] && playersObj[gameData.uid2] && playersObj[gameData.uid1].ready && playersObj[gameData.uid2].ready;

        if (bothReady && !gameData.gameOn) {
            await moveGameToActive(gameId, gameData);
            statusMessage = 'Both players ready! Starting game...';
            console.log(`Starting game ${gameId} because both players are ready.`);
            try {
                sessionStorage.setItem('gameID', gameId);
            } catch (e) { }
            window.location.href = 'BbBgame.html';
            return;
        }

        // If the game has been marked active, redirect this client to the game page
        if (gameData.gameOn) {
            try {
                sessionStorage.setItem('gameID', gameId);
            } catch (e) { }
            window.location.href = 'BbBgame.html';
        }

        if (gameActionButton) {
            gameActionButton.show();
        }
    });
}

function updateUIForAuth(loggedIn) {
    if (loggedIn) {
        loginButton.hide();
        getoutButton.show();
        createGameButton.show();
        joinGameButton.show();
        usernameInput.show();
        gameCodeInput.show();

        // Show game action button if in a game
        if (gameID) {
            gameActionButton.show();
        }

        // Set username if available
        usernameInput.value(currentUsername || auth.currentUser?.displayName || '');
    } else {
        loginButton.show();
        getoutButton.hide();
        createGameButton.hide();
        joinGameButton.hide();
        usernameInput.hide();
        gameCodeInput.hide();
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

function handleExitToSelection() {
    window.location.href = '../../../startscreen.html';
}

function setupUI() {
    // Login UI
    loginButton = createButton('Login with Google');
    loginButton.position(20, 20);
    loginButton.mousePressed(handleLogin);

    getoutButton = createButton('Exit to Start Screen');
    getoutButton.position(185, 50);
    getoutButton.mousePressed(handleExitToSelection);
    getoutButton.hide();

    // Username input
    usernameInput = createInput('');
    usernameInput.position(20, 70);
    usernameInput.attribute('placeholder', 'Enter Username');
    usernameInput.hide();

    // Game creation UI
    createGameButton = createButton('Create Game');
    createGameButton.position(20, 110);
    createGameButton.mousePressed(createNewGame);
    createGameButton.hide();
    // Prevent creating/joining while waiting for opponent
    if (joinGameButton) joinGameButton.hide();
    if (gameCodeInput) gameCodeInput.hide();
    if (usernameInput) usernameInput.hide();

    joinGameButton = createButton('Join Game');
    joinGameButton.position(185, 110);
    joinGameButton.mousePressed(joinGame);
    joinGameButton.hide();

    gameCodeInput = createInput('');
    gameCodeInput.position(20, 150);
    gameCodeInput.attribute('placeholder', 'Enter Game Code');
    gameCodeInput.hide();

    // Single Leave & Change Class button
    gameActionButton = createButton('Leave');
    gameActionButton.position(20, 190);
    gameActionButton.mousePressed(handelLeave);
    gameActionButton.hide();
}

// Fetch available games from the database and update availableGames array
async function refreshAvailableGames() {
    if (!isAuthenticated) return;

    try {
        // Query waiting games directly so only joinable codes are shown
        const gamesRef = ref(database, 'gameScore/BbB/Wait');
        const snapshot = await get(gamesRef);

        if (snapshot.exists()) {
            availableGames = [];
            snapshot.forEach((childSnapshot) => {
                const game = childSnapshot.val();
                // Only include games that have a host and are not full
                if (game && game.uid1 && (!game.uid2 || game.uid2 === "") && game.gameOn !== true) {
                    availableGames.push({
                        gameID: childSnapshot.key,
                        uid1: game.uid1,
                        player1Name: game.player1Name || 'Anonymous',
                        class1: game.class1 || 'Unknown'
                    });
                }
            });
        } else {
            availableGames = [];
        }

        statusMessage = `Found ${availableGames.length} available games`;
        console.log('Numbers of game so far:', availableGames);
    } catch (error) {
        console.error('Error fetching games:', error);
        statusMessage = 'Error refreshing games';
    }
}

function checkAuthState() { // Check authentication state and set up listener
    fb_onAuthStateChanged(async (user) => {
        if (user) {
            isAuthenticated = true;
            userID = user.uid;
            isAdmin = await fb_checkAdminStatus(user.uid);
            await loadUserStats();
            updateUIForAuth(true);
            startLobbyListener();
        } else {
            isAuthenticated = false;
            userID = null;
            isAdmin = false;
            userTotalWins = 0;
            userHighestDamage = 0;
            userTotalDamage = 0;
            updateUIForAuth(false);
        }
    });
}

async function loadUserStats() { // It's in the name. Load UID stats
    if (!userID) return;

    try {
        const userRef = ref(database, `users/${userID}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            userTotalWins = userData.wins || 0;
            userTotalDamage = userData.totalDamage || 0;
            userHighestDamage = userData.highestTotalDamage || 0;
            currentUsername = userData.gameName || auth.currentUser?.displayName || '';
        } else {
            userTotalWins = 0;
            userTotalDamage = 0;
            userHighestDamage = 0;
            currentUsername = auth.currentUser?.displayName || '';
            await update(userRef, {
                wins: 0,
                totalDamage: 0,
                highestTotalDamage: 0,
                gameName: currentUsername
            });
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
        userTotalWins = 0;
        userTotalDamage = 0;
        userHighestDamage = 0;
        currentUsername = auth.currentUser?.displayName || '';
    }
}

async function createNewGame() { // Create a new game and set up initial state in Firebase
    if (!isAuthenticated || !auth.currentUser) {
        statusMessage = 'Please login first';
        console.log('your not supposed to be here yet.');
        return;
    }

    createGameButton.hide();

    const username = usernameInput.value() || auth.currentUser.displayName || 'Player';

    // Generate random game ID
    gameID = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Get random class
    const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    playerClass = randomClass;

    // Create game in Firebase
    const gameRef = ref(database, `gameScore/BbB/Wait/${gameID}`);
    await set(gameRef, {
        gameID: gameID,
        uid1: userID,
        uid2: "",
        Wait: "",
        gameOn: false,
        turn: userID,
        DMG: 0,
        players: {
            [userID]: {
                ready: false,
                class: randomClass,
                name: username
            }
        }
    });

    // Store player info in separate node or in users
    await set(ref(database, `users/${userID}/currentGame`), gameID);
    await set(ref(database, `users/${userID}/currentClass`), randomClass);
        await set(ref(database, `users/${userID}/gameName`), username);
        currentUsername = username;
    sessionStorage.setItem('gameID', gameID);
    sessionStorage.setItem('playerClass', randomClass);
    sessionStorage.setItem('isHost', 'true');

    // Persist host player name and class in the game record
    await update(ref(database, `gameScore/BbB/Wait/${gameID}`), {
        player1Name: username,
        class1: randomClass
    });

    playerClass = randomClass;
    waitingForOpponent = true;

    // Show game action button
    gameActionButton.show();

    statusMessage = `Game created! Code: ${gameID}`;
    console.log(`the game just got created buddy cant you read`)

    startGameListener(gameID);

    console.log(`Game ${gameID} created by user ${userID}`);
}

async function joinGame() {
    if (!isAuthenticated) {
        statusMessage = 'Please login first';
        console.log('you idiot');
        return;
    }

    const gameCode = gameCodeInput.value().toUpperCase();
    if (!gameCode) {
        statusMessage = 'Please enter a game code';
        console.log('Pressing enter without anything who couldve seen that coming');
        return;
    }

    try {
        // Check if game exists
        const gameRef = ref(database, `gameScore/BbB/Wait/${gameCode}`);
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
            gameID = gameCode;
            startGameListener(gameCode);
            return;
        }

        const username = usernameInput.value() || auth.currentUser.displayName || 'Player';

        // Get random class for joining player
        const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];
        const randomClass = classes[Math.floor(Math.random() * classes.length)];

        // Add player to game
        await update(ref(database, `gameScore/BbB/Wait/${gameCode}`), {
            uid2: userID,
            player2Name: username,
            class2: randomClass
        });

        await set(ref(database, `gameScore/BbB/Wait/${gameCode}/players/${userID}`), {
            ready: false,
            class: randomClass,
            name: username
        });

        // Store player info
        await set(ref(database, `users/${userID}/currentGame`), gameCode);
        await set(ref(database, `users/${userID}/currentClass`), randomClass);
        await set(ref(database, `users/${userID}/gameName`), username);
        currentUsername = username;

        // Store in sessionStorage for waiting page
        sessionStorage.setItem('gameID', gameCode);
        sessionStorage.setItem('playerClass', randomClass);
        sessionStorage.setItem('isHost', 'false');

        gameID = gameCode;
        playerClass = randomClass;
        waitingForOpponent = true;

        // Hide create/join controls while waiting
        if (createGameButton) createGameButton.hide();
        if (joinGameButton) joinGameButton.hide();
        if (gameCodeInput) gameCodeInput.hide();
        if (usernameInput) usernameInput.hide();

        // Show game action button
        gameActionButton.show();

        statusMessage = `Joined game: ${gameCode}`;

        startGameListener(gameID);

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
        console.log(`Assigned ${randomClass} to player ${playerIds[i]} in game ${gameId}`);
    }
}

async function toggleReady() {
    if (!gameID || !userID) return;
    const newReadyState = !playerReady;
    await set(ref(database, `gameScore/BbB/Wait/${gameID}/players/${userID}/ready`), newReadyState);
}

function updateReadyStates(gameData) {
    if (!gameData || !userID) return;
    const players = gameData.players || {};
    const otherUid = gameData.uid1 === userID ? gameData.uid2 : gameData.uid1;

    playerReady = !!(players[userID] && players[userID].ready);
    oppReady = !!(otherUid && players[otherUid] && players[otherUid].ready);
}

async function moveGameToActive(gameId, gameData) {
    const waitRef = ref(database, `gameScore/BbB/Wait/${gameId}`);
    const activeRef = ref(database, `gameScore/BbB/gameOn/${gameId}`);
    const activeGameData = {
        ...gameData,
        gameOn: true,
        status: 'active'
    };

    await set(activeRef, activeGameData);
    await set(waitRef, null);
}

async function startGame(gameId, gameData) {
    await moveGameToActive(gameId, gameData);
    statusMessage = 'Game starting soon!';
    console.log(`Wait this actually works?`);
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
            console.log(`Game ${gameID} no longer exists`);
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
                Wait: '',
                statusMessage: 'Left the game'
            });

        }

        // Clear user's game state
        await set(ref(database, `users/${userID}/currentGame`), null);
        await set(ref(database, `users/${userID}/currentClass`), null);

        clearGameState();
    } catch (error) {
        statusMessage = 'Error cancelling game: ' + error.message;
    }
}

//Remove game if player1 leaves
function clearGameState() {
    gameID = null;
    playerClass = '';
    oppClass = '';
    playerReady = false;
    oppReady = false;
    waitingForOpponent = false;
    currentGameData = null;
    sessionStorage.removeItem('gameID');
    sessionStorage.removeItem('playerClass');
    sessionStorage.removeItem('isHost');
    gameActionButton.hide();
    createGameButton.show();
    joinGameButton.show();
}

async function changeClass() {//set class
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

// Function to change class directly
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

// Combined leave lobby and change class function
async function handelLeave() {
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

        // First, change to a new random class
        const classes = ['Barbarian', 'Cleric', 'Wizard', 'Paladin', 'Spartan'];
        const currentIndex = classes.indexOf(playerClass);
        const newIndex = (currentIndex + 1) % classes.length;
        const newClass = classes[newIndex];

        // Update the class in the database
        if (gameData.uid1 === userID) {
            await update(gameRef, { class1: newClass });
        } else if (gameData.uid2 === userID) {
            await update(gameRef, { class2: newClass });
        }
        await set(ref(database, `users/${userID}/currentClass`), newClass);
        playerClass = newClass;
        sessionStorage.setItem('playerClass', newClass);

        // Then leave the game
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
        console.log(`Player ${userID} left the game`);
        clearGameState();
    } catch (error) {
        statusMessage = 'Error: ' + error.message;
        console.error('Error leaving game:', error);
    }
    createGameButton.show();
}

function drawLoginPrompt() {
    fill(100);
    textSize(20);
    textAlign(CENTER);
    text('Please login to continue. Seriously. do it.', width / 2, height / 2);
}

function drawLobby() {
    if (gameID) {
        drawGameLobby();
    } else {
        drawLeaderboard();
        drawAvailableGames();
    }

    // Draw user info
    fill(0);
    textSize(14);
    textAlign(LEFT);
    const loggedInName = currentUsername || usernameInput?.value() || auth.currentUser?.displayName || 'User';
    text(`Logged in as: ${loggedInName}`, 20, height - 40);
    if (isAdmin) {
        text('(Admin)', 20, height - 20);
    }
}

// drawAvailableGames with proper click area storage
function drawAvailableGames() {
    fill(15);
    textSize(20);
    textAlign(LEFT);
    text('Available Games:', 20, 200);

    let y = 240;
    availableGames.forEach((game, index) => {
        // Draw game box
        fill(240);
        stroke(0);
        rect(20, y - 15, 400, 40);

        // Show game info
        fill(0);
        textSize(16);
        let playerCount = game.uid1 ? 1 : 0;
        let displayName = game.player1Name || 'Anonymous';
        text(`${displayName}'s Game (${game.gameID}) - ${playerCount}/2 players`, 30, y + 10);

        // Draw Join button
        fill(0, 100, 200);
        rect(350, y - 10, 60, 30);
        fill(255);
        textSize(14);
        text('Join', 380, y + 10);

        // Store click area for this game's Join button
        if (!window.joinAreas) window.joinAreas = [];
        window.joinAreas.push({
            x1: 350, y1: y - 10, x2: 410, y2: y + 20,
            gameID: game.gameID
        });

        y += 50;
    });
}

// Moved from BbBwaiting.js for testing
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

    const currentPlayer = currentgameName || auth.currentUser?.displayName || 'Player 1';
    const opponentPlayer = { username: opponentgameName || 'Waiting...' };

    // Player 1 (current player)
    drawPlayerBox(player1X, playerY, currentPlayer, playerClass, playerReady);
    // VS TEXT
    fill(100);
    textSize(32);
    text('VS', width / 2, playerY + 75);
    // Player 2 (opponent)
    drawPlayerBox(player2X, playerY, opponentPlayer, oppClass, oppReady);

    const bothPlayersPresent = currentGameData && currentGameData.uid1 && currentGameData.uid2 && currentGameData.uid2 !== "";
    const readyCount = (playerReady ? 1 : 0) + (oppReady ? 1 : 0);

    if (bothPlayersPresent) {
        // Only show the button if player is not ready
        if (!playerReady) {
            fill(0, 150, 0);
            rect(width / 2 - 60, 450, 120, 40);
            fill(255);
            textSize(18);
            textAlign(CENTER);
            text('Ready Up', width / 2, 450);
        } else {
            // Show ready status instead of button
            fill(0, 150, 0);
            textSize(18);
            textAlign(CENTER);
            text('You are Ready!', width / 2, 450);
        }

        fill(0);
        textSize(16);
        text(`${readyCount}/2 players ready`, width / 2, 520);
    } else {
        fill(0);
        textSize(16);
        text('Waiting for opponent to join...', width / 2, 520);
    }

    if (playerReady && oppReady) {
        fill(0, 150, 0);
        textSize(20);
        text('Both players ready! Starting game...', width / 2, 550);
    }
}

async function drawLeaderboard() {
    const boardW = 500;
    const boardH = 300;
    const boardX = width / 2 - boardW / 2;
    const boardY = 140;

    // Draw leaderboard background
    fill(245);
    stroke(30);
    strokeWeight(2);
    rect(boardX, boardY, boardW, boardH, 20);

    noStroke();
    fill(20);
    textSize(18);
    textStyle(BOLD);
    text('Leaderboard', width / 2, boardY + 10);

    textStyle(NORMAL);
    textSize(14);
    fill(40);
    text(`User`, width / 2.65, boardY + 32);
    text(`Wins`, width / 2.05, boardY + 32);
    text(`Total Damage`, width / 1.75, boardY + 32);

    // Leaderboard
    const now = Date.now();
    if (now - lastLeaderboardFetch > LEADERBOARD_REFRESH_INTERVAL || leaderboardData.length === 0) {
        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            
            if (snapshot.exists()) {
                const usersData = snapshot.val();
                leaderboardData = Object.entries(usersData)
                    .map(([uid, data]) => ({
                        uid,
                        username: data.gameName || 'Anonymous',
                        wins: data.wins || 0,
                        totalDamage: data.totalDamage || 0
                    }))
                    .sort((a, b) => b.wins - a.wins)
                    .slice(0, 10); // Show top 10 users
                
                lastLeaderboardFetch = now;
            } else {
                leaderboardData = [];
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            leaderboardData = [];
        }
    }

    // Display leaderboard data
    if (leaderboardData.length > 0) {
        let yPos = boardY + 50;
        leaderboardData.forEach((user, index) => {
            fill(40);
            textSize(13);
            textAlign(LEFT);
            // Display rank and username
            text(`${index + 1}. ${user.username}`, boardX + 20, yPos);
            // Display wins (centered)
            textAlign(CENTER);
            text(user.wins, width / 2.05, yPos);
            // Display total damage (right aligned)
            textAlign(LEFT);
            text(user.totalDamage, boardX + 340, yPos);
            yPos += 25;
        });
    } else {
        fill(100);
        textSize(14);
        textAlign(CENTER);
        text('No users found', width / 2, boardY + 100);
    }
}

// mouseClicked handles both Ready Up button AND Join Game buttons
function mouseClicked() {
    // First check if we're in a game lobby (Ready Up button)
    const bothPlayersPresent = currentGameData && currentGameData.uid1 && currentGameData.uid2 && currentGameData.uid2 !== "";
    if (bothPlayersPresent && !playerReady) {
        if (mouseX > width / 2 - 60 && mouseX < width / 2 + 60 && mouseY > 450 && mouseY < 490) {
            toggleReady();
            return false;
        }
    }

    // Check for clicks on available game "Join" buttons (when not in a game)
    if (!gameID && window.joinAreas) {
        for (let area of window.joinAreas) {
            if (mouseX > area.x1 && mouseX < area.x2 && mouseY > area.y1 && mouseY < area.y2) {
                // Join this game!
                gameCodeInput.value(area.gameID);
                joinGame();
                // Clear join areas after click to prevent double joins
                window.joinAreas = [];
                return false;
            }
        }
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

// Clean up Firebase listeners and cancel waiting games when leaving the page
function windowWillUnload() {
    if (lobbyListener) {
        lobbyListener(); // Clean up lobby listener
    }
    if (gameInterval) {
        gameInterval(); // Clean up game listener
    }

    if (gameID) {
        cancelGame().catch(() => {});
    }
}

// Reset join areas array at the start of each draw frame
function draw() {
    // Reset join areas before drawing
    window.joinAreas = [];

    background(255);
    // Make title
    fill(15);
    textSize(32);
    textAlign(CENTER, TOP);
    text('BLANDBOURN BOUT', width / 2, 60);
    // Make status message
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

// Expose sketch functions to global scope for p5.js
window.setup = setup;
window.preload = preload;
window.draw = draw;
window.mouseClicked = mouseClicked;

// Add event listener for cleanup on page unload
window.addEventListener('beforeunload', windowWillUnload);
window.addEventListener('pagehide', windowWillUnload);
window.addEventListener('pagehide', windowWillUnload);