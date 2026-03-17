/*************************************************************
-BbB.js
-OKAY THIS IS THE ACTUAL GAME
-Every game played here is a sepprate firebase database/string

/*************************************************************/

import { fb_initialise, fb_authChanged }
    from "../../../fb_io.mjs"; //Import

function setup() {
    createCanvas(windowWidth, windowHeight);
    funcSetupScore();
    setupHealthDisplayU();
    setupHealthDisplayOpp();
    funcImg();

    // Initialize Firebase  
    fb_initialise();
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

fb_initialise();
/*******************************************************/
function preload() { //Preload everyting for further purposes. This should only load once.
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to sony and playstation
    imgWizard = loadImage('../other/image.jpg'); // image.jpg is a placeholder
    imgPalidin = loadImage('../other/image.jpg');
    imgBardarian = loadImage('../other/image.jpg');
    imgCleric = loadImage('../other/image.jpg');
    imgBG1 = loadImage('../other/battleback1.png'); // All backgrounds credit to Gabriel 'Nidhoggn' de Aguiar 
                                                    // (https://opengameart.org/users/nidhoggn)
    imgBG2 = loadImage('../other/battleback2.png');
}


const gameMod = (function () {
    const api = {};
    //Map object (Dustinpfister.github.io)
    api.isAtCorner = function (game, cell) {
        const map = game.map[game.mapIndex];
        const w = map.w - 1;
        const h = map.h - 1;
        return (cell.x === 0 && cell.y === 0) ||
            (cell.x === 0 && cell.y === h) ||
            (cell.x === w && cell.y === h) ||
            (cell.x === w && cell.y === 0);
    };
    return api;
})();
