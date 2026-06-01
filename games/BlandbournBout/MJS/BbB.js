/*************************************************************
-BbB.js
-OKAY THIS IS THE ACTUAL GAME
-Every game played here is a separate firebase database/string
*************************************************************/

import {
    fb_initialise, fb_signInWithGoogle,
    fb_onAuthStateChanged, fb_authChanged,
    fb_signOut, fb_checkAdminStatus,
    auth, database, ref, set, get,
    onValue, update
} from "../../../fb_io.mjs";

// ==================== GLOBAL STATE ====================
let gameID = null;
let userID = null;
let playerClass = null;
let opponentClass = null;
let playerName = "Warrior";
let opponentName = "Challenger";
let playerHP = 0;
let opponentHP = 0;
let maxPlayerHP = 0;
let maxOpponentHP = 0;
let currentTurn = null;
let myTurn = false;
let gameActive = true;
let winnerDeclared = false;
let lastMoveUsed = null;
let gameListener = null;
let actionInProgress = false;
let battleLog = [];

// Damage tracking for each player (from Firebase fields)
let playerTotalDamageDealt = 0;
let opponentTotalDamageDealt = 0;

// Cooldown system (every move takes 2 turns to recharge, special takes 5)
let playerCooldowns = {
    neutral: 0,
    heavy: 0,
    heal: 0,
    special: 0
};
let opponentCooldowns = {
    neutral: 0,
    heavy: 0,
    heal: 0,
    special: 0
};

// Status effects
let playerEffects = {
    bleedTurns: 0,
    passiveHealTurns: 0,
    dmgBuffTurns: 0,
    blockRemaining: false,
    weakenTurns: 0
};
let opponentEffects = {
    bleedTurns: 0,
    passiveHealTurns: 0,
    dmgBuffTurns: 0,
    blockRemaining: false,
    weakenTurns: 0
};

// ==================== CLASS STATISTICS ====================
// Each class has unique HP, move damage, healing, and special ability
const CLASS_STATS = {
    Barbarian: { 
        hp: 150,           // High HP, high damage, sluggish healing
        neutral: 20, 
        heavy: 45, 
        heal: 20, 
        special: "bleed", 
        specialDesc: "Bleed: 5 damage for 3 turns"
    },
    Cleric: { 
        hp: 100,           // Low HP, high healing
        neutral: 15, 
        heavy: 20, 
        heal: 45, 
        special: "passiveHeal", 
        specialDesc: "Passive heal: +10 HP for 3 turns"
    },
    Spartan: { 
        hp: 125,           // Balanced, damage buff special
        neutral: 20, 
        heavy: 30, 
        heal: 25, 
        special: "dmgBuff", 
        specialDesc: "Damage buff: +10 damage for 3 turns"
    },
    Paladin: { 
        hp: 125,           // Balanced, block special
        neutral: 15, 
        heavy: 25, 
        heal: 35, 
        special: "block", 
        specialDesc: "Block: Negate next attack"
    },
    Wizard: { 
        hp: 85,            // Very low HP, high neutral damage, weaken special
        neutral: 25, 
        heavy: 10, 
        heal: 50, 
        special: "weaken", 
        specialDesc: "Weaken: Reduce enemy damage by 10 for 3 turns"
    }
};

// Image variables
let imgSpartan, imgWizard, imgPaladin, imgBarbarian, imgCleric, imgPlaceholder;
let classImages = {};

// UI state
let statusMessage = "Loading battle...";
let lastActionText = "";

// Button coordinates for click detection
let buttons = [];

// Store which player is which
let isPlayer1 = false;
let opponentUID = null;

// Store user's wins
let userTotalWins = 0;

// ==================== P5.js SETUP ====================
function preload() {
    imgPlaceholder = loadImage('../other/images.jpg');
    imgSpartan = loadImage('../other/Kratos_PS4.png');
    imgWizard = loadImage('../other/BbBWiz.png');
    imgPaladin = loadImage('../other/BbBPal.png');
    imgBarbarian = loadImage('../other/BbBBarb.png');
    imgCleric = loadImage('../other/BbBCler.png');
        
    classImages = {
        'Spartan': imgSpartan,
        'Wizard': imgWizard,
        'Paladin': imgPaladin,
        'Barbarian': imgBarbarian,
        'Cleric': imgCleric,
        'default': imgPlaceholder
    };
}
function setup() {
    createCanvas(1400, 800);
    textFont('monospace');
    textAlign(CENTER, CENTER);
    rectMode(CORNER);
    
    fb_initialise().then(() => {
        console.log('Firebase initialized for game');
        setupGame();
    });
}

// ==================== GAME INITIALIZATION ====================
// Retrieves game data from sessionStorage and Firebase
async function setupGame() {
    gameID = sessionStorage.getItem('gameID');
    userID = sessionStorage.getItem('userID');

}

// ==================== LOAD USER WINS ====================
// Retrieves the user's total wins from the users/{uid} path in Firebase
async function loadUserWins() {
    try {
        const userRef = ref(database, `users/${userID}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            userTotalWins = userData.wins || 0;
        } else {
            userTotalWins = 0;
            await set(ref(database, `users/${userID}/wins`), 0);
        }
    } catch (error) {
        console.error('Error loading user wins:', error);
        userTotalWins = 0;
    }
}

// ==================== LOAD GAME DATA ====================
// Loads the current game state from Firebase
// Reads from gameScore/BbB/gameOn/{gameID}
async function loadGameData() {
    try {
        const gameRef = ref(database, `gameScore/BbB/gameOn/${gameID}`);
        const snapshot = await get(gameRef);
        
        if (!snapshot.exists()) {
            statusMessage = "Game not found!";
            console.error(`Game ${gameID} not found`);
            return;
        }
        
        const gameData = snapshot.val();
        console.log('Game data loaded:', gameData);
        
        // Determine which player slot the current user occupies
        if (gameData.uid1 === userID) {
            // User is player 1
            isPlayer1 = true;
            playerClass = gameData.class1;
            opponentClass = gameData.class2;
            opponentName = gameData.player2Name || "Opponent";
            playerName = gameData.player1Name || auth.currentUser?.displayName || "Player";
            opponentUID = gameData.uid2;
            
            // Load health and damage from uid1 fields
            playerHP = gameData.uid1health || CLASS_STATS[playerClass]?.hp || 100;
            playerTotalDamageDealt = gameData.uid1DMG || 0;
            
        } else if (gameData.uid2 === userID) {
            // User is player 2
            isPlayer1 = false;
            playerClass = gameData.class2;
            opponentClass = gameData.class1;
            opponentName = gameData.player1Name || "Opponent";
            playerName = gameData.player2Name || auth.currentUser?.displayName || "Player";
            opponentUID = gameData.uid1;
            
            // Load health and damage from uid2 fields
            playerHP = gameData.uid2health || CLASS_STATS[playerClass]?.hp || 100;
            playerTotalDamageDealt = gameData.uid2DMG || 0;
        } else {
            statusMessage = "You are not a player in this game!";
            console.error(`User ${userID} not in game ${gameID}`);
            return;
        }
        
        // Load opponent's health from the appropriate field
        if (isPlayer1) {
            opponentHP = gameData.uid2health || CLASS_STATS[opponentClass]?.hp || 100;
            opponentTotalDamageDealt = gameData.uid2DMG || 0;
        } else {
            opponentHP = gameData.uid1health || CLASS_STATS[opponentClass]?.hp || 100;
            opponentTotalDamageDealt = gameData.uid1DMG || 0;
        }
        
        // Set maximum HP based on class
        maxPlayerHP = CLASS_STATS[playerClass]?.hp || 100;
        maxOpponentHP = CLASS_STATS[opponentClass]?.hp || 100;
        
        // Determine whose turn it is
        currentTurn = gameData.turn;
        myTurn = (currentTurn === userID);
        
        // Load status effects and cooldowns if they exist
        if (gameData.playerEffects) Object.assign(playerEffects, gameData.playerEffects);
        if (gameData.opponentEffects) Object.assign(opponentEffects, gameData.opponentEffects);
        if (gameData.playerCooldowns) Object.assign(playerCooldowns, gameData.playerCooldowns);
        if (gameData.opponentCooldowns) Object.assign(opponentCooldowns, gameData.opponentCooldowns);
        if (gameData.lastMoveUsed) lastMoveUsed = gameData.lastMoveUsed;
        
        statusMessage = myTurn ? "YOUR TURN! Choose an action" : "Opponent's turn... Waiting...";
        
        // Check if game has ended
        if (gameData.gameActive === false) {
            gameActive = false;
        }
        
        // Check for winner
        if (gameData.winner) {
            gameActive = false;
            winnerDeclared = true;
            statusMessage = gameData.winner === playerName ? "VICTORY!" : "DEFEAT!";
        } else if (playerHP <= 0) {
            gameActive = false;
            winnerDeclared = true;
            statusMessage = "You have been defeated!";
        } else if (opponentHP <= 0) {
            gameActive = false;
            winnerDeclared = true;
            statusMessage = "VICTORY! You won!";
            saveWinToFirebase();
        }
        
    } catch (error) {
        console.error('Error loading game data:', error);
        statusMessage = "Error loading game";
    }
}

// ==================== REAL-TIME GAME LISTENER ====================
// Listens for changes to the game data in Firebase and updates the UI
function startGameListener() {
    if (gameListener) {
        off(gameListener);  // Clean up existing listener
    }
    
    const gameRef = ref(database, `gameScore/BbB/gameOn/${gameID}`);
    gameListener = onValue(gameRef, (snapshot) => {
        if (!snapshot.exists()) {
            statusMessage = "Game no longer exists";
            return;
        }
        
        const gameData = snapshot.val();
        updateGameState(gameData);
    });
}

// ==================== UPDATE GAME STATE ====================
// Updates local game state when Firebase data changes
function updateGameState(gameData) {
    if (winnerDeclared && gameActive === false) return;
    
    // Update player HP from the appropriate Firebase field
    if (isPlayer1) {
        if (gameData.uid1health !== undefined && gameData.uid1health !== playerHP) {
            playerHP = gameData.uid1health;
        }
        if (gameData.uid2health !== undefined && gameData.uid2health !== opponentHP) {
            opponentHP = gameData.uid2health;
        }
        if (gameData.uid1DMG !== undefined) playerTotalDamageDealt = gameData.uid1DMG;
        if (gameData.uid2DMG !== undefined) opponentTotalDamageDealt = gameData.uid2DMG;
    } else {
        if (gameData.uid2health !== undefined && gameData.uid2health !== playerHP) {
            playerHP = gameData.uid2health;
        }
        if (gameData.uid1health !== undefined && gameData.uid1health !== opponentHP) {
            opponentHP = gameData.uid1health;
        }
        if (gameData.uid2DMG !== undefined) playerTotalDamageDealt = gameData.uid2DMG;
        if (gameData.uid1DMG !== undefined) opponentTotalDamageDealt = gameData.uid1DMG;
    }

    // Update turn information
    if (gameData.turn !== undefined) {
        currentTurn = gameData.turn;
        myTurn = (currentTurn === userID);
    }
    
    // Update status effects
    if (gameData.playerEffects) Object.assign(playerEffects, gameData.playerEffects);
    if (gameData.opponentEffects) Object.assign(opponentEffects, gameData.opponentEffects);
    
    // Update cooldowns
    if (gameData.playerCooldowns) Object.assign(playerCooldowns, gameData.playerCooldowns);
    if (gameData.opponentCooldowns) Object.assign(opponentCooldowns, gameData.opponentCooldowns);
    
    // Update last move used
    if (gameData.lastMoveUsed) lastMoveUsed = gameData.lastMoveUsed;
    
    // Update last action text
    if (gameData.lastActionText) {
        lastActionText = gameData.lastActionText;
    }
    
    // Check for winner (multiple conditions for redundancy)
    if (gameData.winner && !winnerDeclared) {
        gameActive = false;
        winnerDeclared = true;
        statusMessage = gameData.winner === playerName ? "VICTORY!" : "DEFEAT!";
        if (gameData.winner === playerName) {
            saveWinToFirebase();
        }
    } else if (playerHP <= 0 && !winnerDeclared) {
        gameActive = false;
        winnerDeclared = true;
        statusMessage = "You have been defeated!";
    } else if (opponentHP <= 0 && !winnerDeclared) {
        gameActive = false;
        winnerDeclared = true;
        statusMessage = "VICTORY! You won!";
        saveWinToFirebase();
    } else if (gameActive) {
        statusMessage = myTurn ? "YOUR TURN! Choose an action" : "Opponent's turn... Waiting...";
    }
}
