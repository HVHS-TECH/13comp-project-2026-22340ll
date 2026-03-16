/*************************************************************
  -BbBlobby.js 
  -Blandbourn Bout lobby
  -Waiting room for players to join before starting the game.
  -

/*************************************************************/
// -Setup
let userID, uidClass, gameID, gameNumber; // Making these exist
//let player1, player2, gameTurn; (So far, these dont do anything and will break 
// smthn if i remove the slash now)
let playerClass = '';
let oppClass = ''; //hey boy i just bought the brand new iphone it even has an app to destroy all opps watch
let playerReady = false;
let oppReady = false;

console.log("Authenticate Please");


import { fb_initialise, fb_authChanged }
    from '../../../fb_io.mjs'; // import

function setup() {
    createCanvas(windowWidth, windowHight);

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
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to Sony and Playstation. Also using Kratos as the spartan just seems funny to me.
    imgWizard = loadImage('../other/image.jpg'); 
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
}

//this is how the classes are sorted. I'm hoping that it will randomized every game to prevent total class maining.
async function assignRandomClasses(gameId, playerIds) {
    const classes = ['Barbarian', 'Cleric', 'Mage', 'Paladin', 'Spartan'];
    
    const gameRef = ref(database, `BbB/games/${gameId}/players`);
    
    for (let i = 0; i < playerIds.length; i++) {
        const randomClass = classes[Math.floor(Math.random() * classes.length)];
        await set(ref(database, `BbB/games/${gameId}/players/${playerIds[i]}/class`), randomClass);
    }
}
