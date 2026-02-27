import { fb_initialise } from "../../../fb_io.mjs";

fb_initialise
/*******************************************************/
function preload() {
    imgPlaceholder = loadImage('../other/image.jpg');
    imgSpartan = loadImage('../other/Kratos_PS4.png');
    imgWizard = loadImage('../other/');
    imgPalidin = loadImage('../other/');
    imgBardarian = loadImage('../other/');
    imgCleric = loadImage('../other/');



}

function setup() { //Setup. Yes this needs to happen.
    createCanvas(windowWidth, windowHeight);
    funcSetupScore();
    setupHealthDisplayU();
    setupHealthDisplayOpp();
    funcImg();
}