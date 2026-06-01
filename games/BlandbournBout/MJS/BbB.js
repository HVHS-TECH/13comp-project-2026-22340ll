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
    createCanvas(windowWidth, windowHeight);
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
    
    // Prevent using the same move twice in a row
    if (lastMoveUsed === actionType) {
        statusMessage = "You cannot use the same move twice in a row!";
        return;
    }
    
    actionInProgress = true;
    
    const stats = CLASS_STATS[playerClass];
    let damage = 0;
    let healing = 0;
    let actionLog = "";
    let newPlayerEffects = { ...playerEffects }; // "..." avoids mutating the original playerEffects and opponentEffects
    let newOpponentEffects = { ...opponentEffects };
    
    // Calculate damage modifiers from status effects
    let playerDamageBonus = (playerEffects.dmgBuffTurns > 0) ? 10 : 0;
    let opponentDamageReduction = (opponentEffects.weakenTurns > 0) ? 10 : 0;
    
    // ==================== MOVE LOGIC ====================
    switch(actionType) {
        case "neutral":
            damage = stats.neutral + playerDamageBonus - opponentDamageReduction;
            damage = Math.max(1, damage);  // Minimum 1 damage
            actionLog = `${playerName} uses NEUTRAL ATTACK!`;
            playerCooldowns.neutral = 2;   // 2 turn cooldown
            break;
        case "heavy":
            damage = stats.heavy + playerDamageBonus - opponentDamageReduction;
            damage = Math.max(1, damage);
            actionLog = `${playerName} uses HEAVY STRIKE!`;
            playerCooldowns.heavy = 2;
            break;
        case "heal":
            healing = stats.heal;
            actionLog = `${playerName} uses HEAL! Restored ${healing} HP.`;
            playerCooldowns.heal = 2;
            break;
        case "special":
            actionLog = `${playerName} uses SPECIAL!`;
            playerCooldowns.special = 5;   // Special has 5 turn cooldown
            
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
    let newPlayerDamageTotal = playerTotalDamageDealt;
    let newOpponentDamageTotal = opponentTotalDamageDealt;
    
    if (damageDealtThisTurn > 0) {
        newPlayerDamageTotal += damageDealtThisTurn;
    }
    
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
        lastMoveUsed: actionType,
        lastActionText: actionLog,
        playerCooldowns: playerCooldowns,
        opponentCooldowns: opponentCooldowns,
        playerEffects: newPlayerEffects,
        opponentEffects: newOpponentEffects
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

