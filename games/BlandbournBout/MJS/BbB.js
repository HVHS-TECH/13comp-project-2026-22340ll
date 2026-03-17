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
    //Map object (https://dustinpfister.github.io/2021/12/10/js-javascript-example-turn-based-rpg/)
    api.isAtCorner = function (game, cell) {
        const map = game.map[game.mapIndex];
        const w = map.w - 1;
        const h = map.h - 1;
        return (cell.x === 0 && cell.y === 0) ||
            (cell.x === 0 && cell.y === h) ||
            (cell.x === w && cell.y === h) ||
            (cell.x === w && cell.y === 0);
    };
        // return a toIndexOptions array for the given map position in the current game map
    var getToIndexOptions = function(game, x, y, ox, oy){
        var toIndex = null,
        dir = '',
        p = game.player,
        map = game.maps[game.mapIndex],
        cell = mapMod.get(map, x, y),
        mwx = game.mapIndex % game.mapWorldWidth,                 // map world x and y
        mwy = Math.floor(game.mapIndex / game.mapWorldWidth ),
        options = [];
        return options;
    };
    api.getToIndexOptions = getToIndexOptions;
    return api;
})();
