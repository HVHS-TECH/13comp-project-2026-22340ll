import { fb_initialize, fb_authChanged } 
  from '../../../fb_io.mjs'; // import

function setup() {
    // Initialize Firebase  
    fb_initialize();
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

function preload() { //Preload everyting for further purposes.
    imgPlaceholder = loadImage('../other/image.jpg'); //placeholder
    imgSpartan = loadImage('../other/Kratos_PS4.png'); // all property of Kratos go to sony and playstation
    imgWizard = loadImage('../other/-');
    imgPalidin = loadImage('../other/-');
    imgBardarian = loadImage('../other/-');
    imgCleric = loadImage('../other/-');
}