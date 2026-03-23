/*************************************************************
-BbBwaiting.js
-Loading screen until somebody joins
-
waiting... waiting... still waiting... screw this imma get some food 
 - Leon, the guy whos making this game. I think.
/*************************************************************/



import { fb_initialise, fb_authChanged } 
  from '../../../fb_io.mjs'; // import

function setup() {
    // Initialize Firebase  
    fb_initialise();
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
    const opponentPlayer = 'Player 2';

    // Player 1 (current player)
    drawPlayerBox(player1X, playerY, currentPlayer, playerClass, playerReady);
    // VS TEXT
    fill(100);
    textSize(32);
    text('VS', width / 2, playerY + 75);
    // Player 2 (opponent)
    drawPlayerBox(player2X, playerY, opponentPlayer, oppClass, oppReady);

    // Player 1 (current player)
    drawPlayerBox(player1X, playerY, currentPlayer, playerClass, playerReady);
    // VS TEXT
    fill(100);
    textSize(32);
    text('VS', width / 2, playerY + 75);
    // Player 2 (opponent)
    drawPlayerBox(player2X, playerY, opponentPlayer, oppClass, oppReady);
}
