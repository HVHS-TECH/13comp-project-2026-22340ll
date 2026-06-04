/*************************************************************
 * BbB.js - BLANDBOURN BOUT
 * OKAY THIS IS THE ACTUAL GAME
 * Every game played here is a separate firebase database/string
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
let lastMove = null;
let lastMoveBy = null;
let gameListener = null;
let actionInProgress = false;
let battleLog = [];

// Damage tracking for each player (from Firebase fields)
let playerTotalDamageDealt = 0;
let opponentTotalDamageDealt = 0;

// Cooldown system (every move takes 3 turns to recharge, special takes 5)
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
// Each class has different HP, move damage, healing, and special ability
const CLASS_STATS = {
    Barbarian: { 
        hp: 75,           // Glass Cannon (thanks william), high damage, sluggish healing
        neutral: 40, 
        heavy: 55, 
        heal: 20, 
        special: "bleed", 
        specialDesc: "Bleed: 5 damage for 3 turns"
    },
    Cleric: { 
        hp: 110,           // Low HP, high healing
        neutral: 15, 
        heavy: 20, 
        heal: 45, 
        special: "passiveHeal", 
        specialDesc: "Passive heal: +10 HP for 3 turns"
    },
    Spartan: { 
        hp: 150,           // High HP, damage buff special
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
        hp: 90,            // Low HP, high neutral damage, weaken special
        neutral: 35, 
        heavy: 10, 
        heal: 35, 
        special: "weaken", 
        specialDesc: "Weaken: Reduce enemy damage by 10 for 3 turns"
    }
};

// Image variables
let imgSpartan, imgWizard, imgPaladin, imgBarbarian, imgCleric, imgPlaceholder;
let battlebackImages = [];
let selectedBattleback = null;
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
let endGameTimeout = null;

// ==================== P5.js SETUP ====================
function preload() {
    imgPlaceholder = loadImage('../other/images.jpg');
    battlebackImages = [         // All backgrounds credit to Gabriel 'Nidhoggn' de Aguiar
        loadImage('../other/battleback1.png'), // (https://opengameart.org/users/nidhoggn)
        loadImage('../other/battleback2.png'), 
        loadImage('../other/battleback3.png'),
        loadImage('../other/battleback9.png'),
        loadImage('../other/battleback10.png')
    ];
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to Sony and Playstation.
    imgWizard = loadImage('../other/BbBWiz.png'); // Also using Kratos as the spartan just seems funny to me.
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
    createCanvas(windowWidth, windowHeight);
    textFont('monospace');
    textAlign(CENTER, CENTER);
    rectMode(CORNER);
    
    fb_initialise().then(() => {
        console.log('Firebase initialized for game');
        setupGame();
    });
}

async function getCurrentUserID() {
    let uid = sessionStorage.getItem('userID');
    if (uid) return uid;
    if (auth.currentUser) return auth.currentUser.uid;

    return new Promise((resolve) => {
        const unsubscribe = fb_onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user ? user.uid : null);
        });
    });
}

// ==================== GAME INITIALIZATION ====================
// Retrieves game data from sessionStorage and Firebase
async function setupGame() {
    gameID = sessionStorage.getItem('gameID');
    userID = await getCurrentUserID();

    if (!gameID) {
        statusMessage = 'Missing game code. Please launch from the lobby.';
        console.error('No gameID in sessionStorage');
        return;
    }

    if (!userID) {
        statusMessage = 'Not signed in. Please log in and retry.';
        console.error('No userID found for game', gameID);
        return;
    }
    
    // Select a random battleback for this game
    selectedBattleback = random(battlebackImages);
    
    await loadUserWins();
    await loadGameData();
    startGameListener();
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
        if (gameData.playerEffects || gameData.opponentEffects) {
            if (isPlayer1) {
                if (gameData.playerEffects) Object.assign(playerEffects, gameData.playerEffects);
                if (gameData.opponentEffects) Object.assign(opponentEffects, gameData.opponentEffects);
            } else {
                if (gameData.playerEffects) Object.assign(opponentEffects, gameData.playerEffects);
                if (gameData.opponentEffects) Object.assign(playerEffects, gameData.opponentEffects);
            }
        }
        if (gameData.playerCooldowns || gameData.opponentCooldowns) {
            if (isPlayer1) {
                if (gameData.playerCooldowns) Object.assign(playerCooldowns, gameData.playerCooldowns);
                if (gameData.opponentCooldowns) Object.assign(opponentCooldowns, gameData.opponentCooldowns);
            } else {
                if (gameData.playerCooldowns) Object.assign(opponentCooldowns, gameData.playerCooldowns);
                if (gameData.opponentCooldowns) Object.assign(playerCooldowns, gameData.opponentCooldowns);
            }
        }
        if (gameData.lastMove) lastMove = gameData.lastMove;
        if (gameData.lastMoveBy) lastMoveBy = gameData.lastMoveBy;
        if (gameData.lastActionText) lastActionText = gameData.lastActionText;
        
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
    if (gameData.playerEffects || gameData.opponentEffects) {
        if (isPlayer1) {
            if (gameData.playerEffects) Object.assign(playerEffects, gameData.playerEffects);
            if (gameData.opponentEffects) Object.assign(opponentEffects, gameData.opponentEffects);
        } else {
            if (gameData.playerEffects) Object.assign(opponentEffects, gameData.playerEffects);
            if (gameData.opponentEffects) Object.assign(playerEffects, gameData.opponentEffects);
        }
    }
    
    // Update cooldowns
    if (gameData.playerCooldowns || gameData.opponentCooldowns) {
        if (isPlayer1) {
            if (gameData.playerCooldowns) Object.assign(playerCooldowns, gameData.playerCooldowns);
            if (gameData.opponentCooldowns) Object.assign(opponentCooldowns, gameData.opponentCooldowns);
        } else {
            if (gameData.playerCooldowns) Object.assign(opponentCooldowns, gameData.playerCooldowns);
            if (gameData.opponentCooldowns) Object.assign(playerCooldowns, gameData.opponentCooldowns);
        }
    }
    
    // Update last move info
    if (gameData.lastMove) lastMove = gameData.lastMove;
    if (gameData.lastMoveBy) lastMoveBy = gameData.lastMoveBy;
    
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
        scheduleEndGameReturn();
    } else if (playerHP <= 0 && !winnerDeclared) {
        gameActive = false;
        winnerDeclared = true;
        statusMessage = "You have been defeated!";
        scheduleEndGameReturn();
    } else if (opponentHP <= 0 && !winnerDeclared) {
        gameActive = false;
        winnerDeclared = true;
        statusMessage = "VICTORY! You won!";
        saveWinToFirebase();
        scheduleEndGameReturn();
    } else if (gameActive) {
        statusMessage = myTurn ? "YOUR TURN! Choose an action" : "Opponent's turn... Waiting...";
    }
}

// ==================== PERFORM ACTION ====================
// Handles the player's move: calculates damage, healing, status effects, and cooldowns
// Then updates Firebase with the new game state
async function performAction(actionType) {
    // Validation: Check if player can act
    if (!myTurn || !gameActive || winnerDeclared || actionInProgress) {
        statusMessage = "Not your turn or game is over!";
        return;
    }
    
    // Check if move is on cooldown
    if (playerCooldowns[actionType] > 0) {
        statusMessage = `${actionType.toUpperCase()} on cooldown! ${playerCooldowns[actionType]} turns remaining.`;
        return;
    }
    
    // Prevent using the same move twice in a row by the same player
    if (lastMoveBy === userID && lastMove === actionType) {
        statusMessage = "You cannot use the same move twice in a row!";
        return;
    }
    
    actionInProgress = true;
    
    const stats = CLASS_STATS[playerClass];
    let damage = 0;
    let healing = 0;
    let actionLog = "";
    let newPlayerHP = playerHP;
    let newOpponentHP = opponentHP;
    let newPlayerEffects = { ...playerEffects }; // "..." avoids mutating the original playerEffects and opponentEffects
    let newOpponentEffects = { ...opponentEffects };
    
    // Calculate damage modifiers from status effects
    let playerDamageBonus = (playerEffects.dmgBuffTurns > 0) ? 10 : 0;
    let opponentDamageReduction = (opponentEffects.weakenTurns > 0) ? 10 : 0;
    
    // Check if opponent is blocking
    let opponentBlocking = opponentEffects.blockRemaining;
    
    // ==================== MOVE LOGIC ====================
    switch(actionType) {
        case "neutral":
            damage = stats.neutral + playerDamageBonus - opponentDamageReduction;
            damage = Math.max(1, damage);  // Minimum 1 damage
            actionLog = `${playerName} uses NEUTRAL ATTACK!`;
            playerCooldowns.neutral = 3;   // 3 turn cooldown
            break;
        case "heavy":
            damage = stats.heavy + playerDamageBonus - opponentDamageReduction;
            damage = Math.max(1, damage);
            actionLog = `${playerName} uses HEAVY STRIKE!`;
            playerCooldowns.heavy = 3;  //3 turn cooldown
            break;
        case "heal":
            healing = stats.heal;
            actionLog = `${playerName} uses HEAL! Restored ${healing} HP.`;
            playerCooldowns.heal = 3; // 3 turn cooldown
            break;
        case "special":
            actionLog = `${playerName} uses SPECIAL!`;
            playerCooldowns.special = 5;   // Special has 5 turn cooldown for balancing purposes
            
            // Apply special ability based on class
            switch(stats.special) {
                case "bleed":
                    newOpponentEffects.bleedTurns = 3;
                    actionLog += " Opponent will bleed for 3 turns!";
                    break;
                case "passiveHeal":
                    newPlayerEffects.passiveHealTurns = 3;
                    actionLog += " You will heal for 3 turns!";
                    break;
                case "dmgBuff":
                    newPlayerEffects.dmgBuffTurns = 3;
                    actionLog += " Your damage is increased for 3 turns!";
                    break;
                case "block":
                    newPlayerEffects.blockRemaining = true;
                    actionLog += " You will block the next attack!";
                    break;
                case "weaken":
                    newOpponentEffects.weakenTurns = 3;
                    actionLog += " Opponent's damage is weakened for 3 turns!";
                    break;
            }
            break;
    }
    
    // Apply healing
    if (healing > 0) {
        newPlayerHP = Math.min(maxPlayerHP, newPlayerHP + healing);
    }
    
    // Apply damage (account for block)
    let damageDealtThisTurn = 0;
    if (damage > 0) {
        if (opponentBlocking) {
            actionLog += " Opponent BLOCKED the attack!";
            newOpponentEffects.blockRemaining = false;
        } else {
            newOpponentHP = Math.max(0, newOpponentHP - damage);
            damageDealtThisTurn = damage;
            actionLog += ` Dealt ${damage} damage!`;
        }
    }
    
    // ==================== APPLY STATUS EFFECTS ====================
    // Bleed effect (damage over time)
    if (playerEffects.bleedTurns > 0) {
        let bleedDamage = 5;
        newPlayerHP = Math.max(0, newPlayerHP - bleedDamage);
        actionLog += ` Bleed deals ${bleedDamage} damage to you!`;
        newPlayerEffects.bleedTurns = playerEffects.bleedTurns - 1;
    }
    if (opponentEffects.bleedTurns > 0) {
        let bleedDamage = 5;
        newOpponentHP = Math.max(0, newOpponentHP - bleedDamage);
        actionLog += ` Bleed deals ${bleedDamage} damage to opponent!`;
        newOpponentEffects.bleedTurns = opponentEffects.bleedTurns - 1;
    }
    
    // Passive heal effect (healing over time)
    if (playerEffects.passiveHealTurns > 0) {
        let passiveHeal = 10;
        newPlayerHP = Math.min(maxPlayerHP, newPlayerHP + passiveHeal);
        actionLog += ` Passive heal restores ${passiveHeal} HP!`;
        newPlayerEffects.passiveHealTurns = playerEffects.passiveHealTurns - 1;
    }
    if (opponentEffects.passiveHealTurns > 0) {
        let passiveHeal = 10;
        newOpponentHP = Math.min(maxOpponentHP, newOpponentHP + passiveHeal);
        actionLog += ` Opponent's passive heal restores ${passiveHeal} HP!`;
        newOpponentEffects.passiveHealTurns = opponentEffects.passiveHealTurns - 1;
    }
    
    // Decrease buff/debuff timers
    if (newPlayerEffects.dmgBuffTurns > 0) newPlayerEffects.dmgBuffTurns--;
    if (newOpponentEffects.weakenTurns > 0) newOpponentEffects.weakenTurns--;
    
    // ==================== UPDATE DAMAGE TRACKING ====================
    let newPlayerDamageTotal = playerTotalDamageDealt + damageDealtThisTurn;
    let newOpponentDamageTotal = opponentTotalDamageDealt;
    
    // Add to battle log
    addToBattleLog(actionLog, "player");
    lastActionText = actionLog;

    // ==================== CHECK FOR WINNER ====================
    let winner = null;
    
    if (newOpponentHP <= 0) {
        winner = playerName;
        gameActive = false;
        winnerDeclared = true;
        addToBattleLog(`${playerName} WINS THE BOUT!`, "system");
    } else if (newPlayerHP <= 0) {
        winner = opponentName;
        gameActive = false;
        winnerDeclared = true;
        addToBattleLog(`${opponentName} WINS THE BOUT!`, "system");
    }
    
    // Decrease cooldowns (move cooldowns decrease each turn)
    for (let key in playerCooldowns) {
        if (playerCooldowns[key] > 0) playerCooldowns[key]--;
    }
    
    // ==================== UPDATE FIREBASE ====================
    const gameRef = ref(database, `gameScore/BbB/gameOn/${gameID}`);
    const updateData = {
        turn: opponentUID,              // Switch turn to opponent
        lastMove: actionType,
        lastMoveBy: userID,
        lastActionText: actionLog,
        playerCooldowns: isPlayer1 ? playerCooldowns : opponentCooldowns,
        opponentCooldowns: isPlayer1 ? opponentCooldowns : playerCooldowns,
        playerEffects: isPlayer1 ? newPlayerEffects : newOpponentEffects,
        opponentEffects: isPlayer1 ? newOpponentEffects : newPlayerEffects
    };
    
    // Update health and damage fields based on player slot
    if (isPlayer1) {
        updateData.uid1health = newPlayerHP;
        updateData.uid2health = newOpponentHP;
        updateData.uid1DMG = newPlayerDamageTotal;
        updateData.uid2DMG = newOpponentDamageTotal;
    } else {
        updateData.uid2health = newPlayerHP;
        updateData.uid1health = newOpponentHP;
        updateData.uid2DMG = newPlayerDamageTotal;
        updateData.uid1DMG = newOpponentDamageTotal;
    }
    
    if (winner) {
        updateData.winner = winner;
        updateData.gameActive = false;
    }
    
    await update(gameRef, updateData);
    
    // ==================== UPDATE LOCAL STATE ====================
    playerHP = newPlayerHP;
    opponentHP = newOpponentHP;
    playerTotalDamageDealt = newPlayerDamageTotal;
    opponentTotalDamageDealt = newOpponentDamageTotal;
    currentTurn = opponentUID;
    myTurn = false;
    actionInProgress = false;

    if (winner) {
        scheduleEndGameReturn();
    }
}

// ==================== BATTLE LOG ====================
// Adds a message to the battle log with a timestamp
function addToBattleLog(message, type = "player") {
    battleLog.unshift({
        message: message,
        type: type,
        time: new Date().toLocaleTimeString()
    });
    if (battleLog.length > 15) battleLog.pop();  // Keep only last 15 entries
}

// ==================== SAVE WIN TO FIREBASE ====================
// Increments the user's win count and total damage in the users/{uid} path
async function saveWinToFirebase() {
    if (!userID || !playerName) return;
    
    try {
        const userRef = ref(database, `users/${userID}`);
        const snapshot = await get(userRef);
        
        let currentWins = 0;
        let currentDamage = 0;
        let previousBest = 0;
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentWins = userData.wins || 0;
            currentDamage = userData.totalDamage || 0;
            previousBest = userData.highestTotalDamage || 0;
        }
        
        const newWins = currentWins + 1;
        const newDamage = currentDamage + playerTotalDamageDealt;
        const bestDamage = Math.max(previousBest, playerTotalDamageDealt);
        
        await update(userRef, {
            wins: newWins,
            totalDamage: newDamage,
            highestTotalDamage: bestDamage,
            lastWinDate: new Date().toISOString()
        });
        
        userTotalWins = newWins;
        console.log(`Win saved! ${playerName} now has ${newWins} wins and highest total damage ${bestDamage}`);
        addToBattleLog(`${playerName} now has ${newWins} total wins!`, "system");
        addToBattleLog(`Best damage record: ${bestDamage}`, "system");
        
    } catch (error) {
        console.error('Error saving win to users:', error);
    }
}

function cleanupEndGameSession() {
    try {
        sessionStorage.removeItem('gameID');
        sessionStorage.removeItem('playerClass');
        sessionStorage.removeItem('isHost');
    } catch (error) {
        console.warn('Could not clean up session storage:', error);
    }
}

function scheduleEndGameReturn() {
    if (endGameTimeout) return;
    statusMessage = 'Game over. Returning to lobby...';
    endGameTimeout = setTimeout(() => {
        cleanupEndGameSession();
        window.location.href = 'BbBlobby.html';
    }, 4000);
}

// ==================== DRAW FUNCTIONS ====================

// Main draw loop - runs every frame
function draw() {
    // Background
    if (selectedBattleback) {
        // Draw battleback stretched to fit width while maintaining aspect ratio
        const bgAspect = selectedBattleback.width / selectedBattleback.height;
        const bgHeight = width / bgAspect;
        image(selectedBattleback, 0, 0, width, bgHeight);
    } else {
        background(20, 25, 45);
    }
    
    // Decorative border
    stroke(201, 168, 123);
    strokeWeight(4);
    noFill();
    rect(20, 20, width - 40, height - 40, 30);
    
    // Game title
    fill(230, 200, 143);
    textSize(36);
    textStyle(BOLD);
    text("BLANDBOURN BOUT", width / 2, 55);
    
    // Display user's win count (top right)
    fill(230, 200, 143);
    textSize(14);
    textAlign(RIGHT, CENTER);
    text(`Wins: ${userTotalWins}`, width - 40, 45);
    textAlign(CENTER, CENTER);
    
    // Status message panel (turn indicator)
    fill(50, 50, 70);
    noStroke();
    rect(width / 2 - 200, 75, 400, 45, 20);
    fill(myTurn && gameActive && !winnerDeclared ? 255 : 200);
    textSize(18);
    text(statusMessage, width / 2, 98);
    
    // VS text between player cards
    fill(230, 200, 143);
    textSize(52);
    text("VS", width / 2, height / 2 - 30);
    
    // Draw both player cards
    drawPlayerCard(true, 80, 160, 500, 380);   // Player card (left)
    drawPlayerCard(false, width - 580, 160, 500, 380); // Opponent card (right)
    
    // Draw action buttons only if it's player's turn and game is active
    if (myTurn && gameActive && !winnerDeclared) {
        drawActionButtons();
    }
    
    // Draw UI panels
    drawBattleLog();
    drawCooldownInfo();
    drawDamageInfo();
    
    // Display last action at the bottom
    if (lastActionText) {
        fill(200, 200, 200);
        textSize(13);
        text(lastActionText, width / 2, height - 50);
    }
}

// Draws a player card with HP bar, class image, name, and status effects
function drawPlayerCard(isPlayer, x, y, w, h) {
    const className = isPlayer ? playerClass : opponentClass;
    const hp = isPlayer ? playerHP : opponentHP;
    const maxHp = isPlayer ? maxPlayerHP : maxOpponentHP;
    const name = isPlayer ? playerName : opponentName;
    const effects = isPlayer ? playerEffects : opponentEffects;
    const totalDamage = isPlayer ? playerTotalDamageDealt : opponentTotalDamageDealt;
    
    // Card background (different colors for player vs opponent)
    if (isPlayer) {
        fill(30, 40, 70);
    } else {
        fill(50, 30, 45);
    }
    stroke(201, 168, 123);
    strokeWeight(2);
    rect(x, y, w, h, 20);
    
    // Class image
    const img = classImages[className] || classImages['default'];
    if (img) {
        if (isPlayer) {
            image(img, x + 25, y + 25, 130, 130);
        } else {
            // Flip opponent sprite horizontally
            push();
            translate(x + 25 + 130, y + 25);
            scale(-1, 1);
            image(img, 0, 0, 130, 130);
            pop();
        }
    }
    
    // Player name
    fill(230, 200, 143);
    textSize(26);
    text(name, x + w / 2, y + 45);
    
    // Class name
    fill(180, 180, 200);
    textSize(18);
    text(className || "???", x + w / 2, y + 80);
    
    // HP bar background
    fill(60, 30, 30);
    rect(x + 25, y + 175, w - 50, 28, 10);
    
    // HP bar fill (percentage based)
    const hpPercent = Math.max(0, hp / maxHp);
    fill(76, 175, 80);
    rect(x + 25, y + 175, (w - 50) * hpPercent, 28, 10);
    
    // HP text
    fill(255);
    textSize(20);
    text(`HP: ${Math.max(0, hp)} / ${maxHp}`, x + w / 2, y + 218);
    
    // Status effects text (BLEED, REGEN, DMG+, BLOCK, WEAKEN)
    let effectText = "";
    if (effects.bleedTurns > 0) effectText += "BLEED ";
    if (effects.passiveHealTurns > 0) effectText += "REGEN ";
    if (effects.dmgBuffTurns > 0) effectText += "DMG+ ";
    if (effects.blockRemaining) effectText += "BLOCK ";
    if (effects.weakenTurns > 0) effectText += "WEAKEN ";
    
    fill(255, 200, 100);
    textSize(13);
    text(effectText, x + w / 2, y + 260);
    
    // Total damage dealt display
    fill(180, 180, 220);
    textSize(12);
    text(`Total Dmg: ${totalDamage}`, x + w / 2, y + 290);
}

// Draws the four action buttons (Neutral, Heavy, Heal, Special)
function drawActionButtons() {
    const stats = CLASS_STATS[playerClass];
    const btnY = height - 140;
    const btnW = 150;
    const btnH = 55;
    const spacing = 25;
    const startX = width / 2 - (btnW * 2 + spacing);
    
    buttons = [];  // Reset button coordinates array
    
    // ===== NEUTRAL BUTTON =====
    let btnX = startX;
    let isNeutralCD = playerCooldowns.neutral > 0;
    fill(isNeutralCD ? 80 : 74, 106, 138);
    rect(btnX, btnY, btnW, btnH, 12);
    fill(255);
    textSize(15);
    text("NEUTRAL", btnX + btnW/2, btnY + btnH/2 - 8);
    textSize(13);
    text(`${stats.neutral} dmg`, btnX + btnW/2, btnY + btnH/2 + 10);
    if (isNeutralCD) {
        fill(255, 100, 100);
        text(`CD: ${playerCooldowns.neutral}`, btnX + btnW/2, btnY + btnH - 12);
    }
    buttons.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: "neutral", isCD: isNeutralCD });
    
    // ===== HEAVY BUTTON =====
    btnX += btnW + spacing;
    let isHeavyCD = playerCooldowns.heavy > 0;
    fill(isHeavyCD ? 80 : 138, 74, 74);
    rect(btnX, btnY, btnW, btnH, 12);
    fill(255);
    text("HEAVY", btnX + btnW/2, btnY + btnH/2 - 8);
    text(`${stats.heavy} dmg`, btnX + btnW/2, btnY + btnH/2 + 10);
    if (isHeavyCD) {
        fill(255, 100, 100);
        text(`CD: ${playerCooldowns.heavy}`, btnX + btnW/2, btnY + btnH - 12);
    }
    buttons.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: "heavy", isCD: isHeavyCD });
    
    // ===== HEAL BUTTON =====
    btnX += btnW + spacing;
    let isHealCD = playerCooldowns.heal > 0;
    fill(isHealCD ? 80 : 74, 138, 94);
    rect(btnX, btnY, btnW, btnH, 12);
    fill(255);
    text("HEAL", btnX + btnW/2, btnY + btnH/2 - 8);
    text(`+${stats.heal} HP`, btnX + btnW/2, btnY + btnH/2 + 10);
    if (isHealCD) {
        fill(255, 100, 100);
        text(`CD: ${playerCooldowns.heal}`, btnX + btnW/2, btnY + btnH - 12);
    }
    buttons.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: "heal", isCD: isHealCD });
    
    // ===== SPECIAL BUTTON =====
    btnX += btnW + spacing;
    let isSpecialCD = playerCooldowns.special > 0;
    fill(isSpecialCD ? 80 : 138, 106, 58);
    rect(btnX, btnY, btnW, btnH, 12);
    fill(255);
    textSize(13);
    text("SPECIAL", btnX + btnW/2, btnY + btnH/2 - 12);
    textSize(10);
    text(stats.specialDesc.substring(0, 18), btnX + btnW/2, btnY + btnH/2 + 5);
    if (isSpecialCD) {
        fill(255, 100, 100);
        textSize(11);
        text(`CD: ${playerCooldowns.special}`, btnX + btnW/2, btnY + btnH - 10);
    }
    buttons.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: "special", isCD: isSpecialCD });
}

// Draws the battle log panel showing recent actions
function drawBattleLog() {
    const logX = 30;
    const logY = height - 230;
    const logW = 320;
    const logH = 180;
    
    fill(0, 0, 0, 200);
    rect(logX, logY, logW, logH, 10);
    
    fill(230, 200, 143);
    textSize(14);
    text("BATTLE LOG", logX + 10, logY + 22);
    
    textSize(11);
    for (let i = 0; i < Math.min(8, battleLog.length); i++) {
        const entry = battleLog[i];
        // Color coding: player actions = blue, system messages = yellow, others = gray
        if (entry.type === "player") fill(100, 200, 255);
        else if (entry.type === "system") fill(255, 220, 100);
        else fill(180);
        let displayMsg = entry.message;
        if (displayMsg.length > 35) displayMsg = displayMsg.substring(0, 32) + "...";
        text(displayMsg, logX + 10, logY + 45 + (i * 16));
    }
}

// Draws the cooldown information panel
function drawCooldownInfo() {
    const infoX = width - 350;
    const infoY = height - 230;
    const infoW = 320;
    const infoH = 180;
    
    fill(0, 0, 0, 200);
    rect(infoX, infoY, infoW, infoH, 10);
    
    fill(230, 200, 143);
    textSize(14);
    text("COOLDOWNS", infoX + 10, infoY + 22);
    
    fill(200);
    textSize(13);
    const neutralStatus = playerCooldowns.neutral > 0 ? `${playerCooldowns.neutral} turns` : "READY";
    const heavyStatus = playerCooldowns.heavy > 0 ? `${playerCooldowns.heavy} turns` : "READY";
    const healStatus = playerCooldowns.heal > 0 ? `${playerCooldowns.heal} turns` : "READY";
    const specialStatus = playerCooldowns.special > 0 ? `${playerCooldowns.special} turns` : "READY";
    
    text(`Neutral: ${neutralStatus}`, infoX + 15, infoY + 55);
    text(`Heavy: ${heavyStatus}`, infoX + 15, infoY + 80);
    text(`Heal: ${healStatus}`, infoX + 15, infoY + 105);
    text(`Special: ${specialStatus}`, infoX + 15, infoY + 130);
    
    fill(255, 200, 100);
    textSize(11);
    const lastMoveDisplay = lastMove ? `${lastMove} (${lastMoveBy === userID ? 'you' : 'opponent'})` : 'none';
    text(`Last move: ${lastMoveDisplay}`, infoX + 15, infoY + 160);
}

// Draws the player's total damage dealt panel
function drawDamageInfo() {
    const infoX = width / 2 - 150;
    const infoY = height - 100;
    const infoW = 300;
    const infoH = 35;
    
    fill(0, 0, 0, 180);
    rect(infoX, infoY, infoW, infoH, 10);
    
    fill(230, 200, 143);
    textSize(12);
    text(`Your Total Damage: ${playerTotalDamageDealt}`, infoX + infoW/2, infoY + infoH/2);
}

// ==================== MOUSE CLICK HANDLER ====================
// Detects clicks on action buttons and triggers the corresponding move
function mouseClicked() {
    for (let btn of buttons) {
        if (mouseX > btn.x && mouseX < btn.x + btn.w && 
            mouseY > btn.y && mouseY < btn.y + btn.h) {
            if (!btn.isCD && !(lastMoveBy === userID && lastMove === btn.action)) {
                performAction(btn.action);
            } else if (btn.isCD) {
                statusMessage = `${btn.action.toUpperCase()} on cooldown!`;
            } else if (lastMoveBy === userID && lastMove === btn.action) {
                statusMessage = `Cannot use ${btn.action} twice in a row!`;
            }
            return false;
        }
    }
    return false;
}

// ==================== WINDOW RESIZE HANDLER ====================
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// ==================== EXPORTS ====================
window.preload = preload;
window.setup = setup;
window.draw = draw;
window.mouseClicked = mouseClicked;
window.windowResized = windowResized;
export { setup, draw, preload, mouseClicked, windowResized };