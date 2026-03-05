/*************************************************************
-BbB.js
-OKAY THIS IS THE ACTUAL GAME
-Everygame is a sepprate firebase database

/*************************************************************/

import {  fb_initialize, fb_authChanged }
from "../../../fb_io.mjs"; //Import

function setup() {
    createCanvas(windowWidth, windowHeight);
    funcSetupScore();
    setupHealthDisplayU();
    setupHealthDisplayOpp();
    funcImg();

    // Initialize Firebase  
    fb_initialize();
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

fb_initialize();
/*******************************************************/
function preload() { //Preload everyting for further purposes. This should only load once.
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to sony and playstation
    imgWizard = loadImage('../other/image.jpg'); // image.jpg is a placeholder
    imgPalidin = loadImage('../other/image.jpg');
    imgBardarian = loadImage('../other/image.jpg');
    imgCleric = loadImage('../other/image.jpg');
    imgBG1 = loadImage('../other/image.jpg');
    imgBG2 = loadImage('../other/image.jpg');

}

