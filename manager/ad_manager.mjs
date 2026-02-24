/*************************************************************
  ad_manager.mjs
  
  Generalised ADMIN code
  Written by Mr Bob, Term 1 2020

  All variables & functions begin with ad_  all const with AD_
  Diagnostic code lines have a comment appended to them //DIAG

  Develop a basic W3.CSS interface.
    v01   Basic layout of landing & game pages.
    v02   Landing/games pages full screen height but only display
          landing page on start up.
    v03   Stop canvas being displayed until its wanted.
    v04   Divide pages into left hand (1/3 of page) & 
          right hand (2/3 page) divs. 
          Also provide a margin at the bottom of pages.
    v05   Add button to landing page which hides the landing page
          and displays game page.
    v06   Add START button and score paragraphs etc to game page 
          left hand div (user control panel).
    v07   Make START button toggle between START and STOP button. 
    v08   Add bouncing balls when START button clicked.
    v09   Add reSize canvas.
    v10   Make font size responsive by using em instead of px.
    v11   Add firebase
    v12   Add admin with fixed table update
    v13   Add numeric validation
    v14   Add further comments
    v15   Modify to accept path as 1st param from readAll & 
          add class to button to set colour grey
    v16   Modify to use admin.html page & session storage
    v17   Alter _dbRec to _snapshot & alter order of function params
          on functions to process firebase readAll
    v18   DID NOT implement v18 change of COL_ to C_
    v19   Modify readAll input parameters to include _save &
          result for compatibility with student code.
    v20   Insert null as 2nd paramter to fb_readAll calls &
          use console.log instead of logIt function
    v21   Fix code comments.
    v22   Replace DB button with GD button to stop confusion
    v23   Alter test for result from readl all to test for "OK" & "no record"
    v23.1 Convert v23 to firebase Modular API. See lines with comment:  //<=MODULAR-API
    v24   Replace GD with GD to stop confusion
    v25   Add ad_readAll() function to read all records in a path
    v26   Fix delete API modular implementation & use let.
*************************************************************/

/*************************************************************          //<=======
  TO IMPLIMENT THE ADMIN FEATURE:                                       //<=======
    1. Copy the ad_manager.css into your style.css file.                //<=======
    2. Copy the entire ad_manager.html into your html file.             //<=======
    3. Create an ad_manger.mjs module in your project &                 //<=======
         copy the contents of this file into it.                        //<=======
    4. Taylor your ad_manger.mjs to fit your program code by looking    //<=======
         at lines ending with  //<=======                               //<=======
*************************************************************/          //<=======
const AD_COL_C = 'black';
const AD_COL_B = '#F0E68C';
console.log('%c ad_manager.mjs',
            'color: blue; background-color: white;');

// ENSURE THE PATH NAMES ARE CORRECT                                    //<=======
const DETAILS = 'userDetails';                                          //<=======
const GD      = 'scores/GD';                                            //<=======
const SI      = 'scores/SI';                                            //<=======

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
// Import all external constants & functions required                   //<=MODULAR-API
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
// Import all the methods you want to call from the firebase module      
import { getDatabase, ref, update, remove, get } 
    from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Import all constants & functions required from fb_io module
// ENSURE THE IMPORTED FUNCTION NAMES & MODULE THEY ARE FROM ARE CORRECT//<=======
import { fb_initialize, fb_authChanged } 
  from '/fb/fb_io.mjs';

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
//  ad_manager EVENT listeners
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
// ENSURE YOU GET ALL THE HTML BUTTONS YOU WANT TO MONITOR              //<=======
const AD_BTN_USER = document.getElementById("b_ad_user");
const AD_BTN_GD   = document.getElementById("b_ad_GD");
const AD_BTN_SI   = document.getElementById("b_ad_SI");

/**************************************************************/
// Event: DOMContentLoaded
// Functions you want to call when the page loads
/**************************************************************/
window.addEventListener('DOMContentLoaded', async () => {
    await fb_initialize();
    fb_authChanged();
    
    // Check admin status before showing anything
    const isAdmin = sessionStorage.getItem('isAdmin') === 'y';
    if (!isAdmin) {
        alert("Admin access required");
        window.location.href = "/"; // Redirect to home page
        return;
    }
    
    ad_user();
});

/**************************************************************/
// Event: click
// For html buttons monitored via label data-track, 
//  call the ad_manager functions associated with the button
// ad_manager.html and the event listener need to match up              //<=======
/**************************************************************/
document.addEventListener("click", function (event) {
    if (event.target.matches("button[data-track]")) {
        // Check admin status first
        const isAdmin = sessionStorage.getItem('isAdmin') === 'y';
        if (!isAdmin) {
            alert("Admin access required");
            return;
        }
        
        console.log('%c btn clicked: ' + event.target.dataset.track,
                    'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
        // Call the function associated with the button
        // ENSURE THE CASE NAME MATCH THE HTML data-track NAMES             //<=======
        switch (event.target.dataset.track) {
            case 'b_ad_user':
                ad_user();
                break;
            case 'b_ad_GD':
                ad_copy();
                break;
            case 'b_ad_SI':
                ad_SI();
                break;
            default:
                console.log('%c btn clicked: No associated function for ' + 
                            event.target.dataset.track,
                            'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
        }
    }
});

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
// ad_manager responses called by ad_manager buttons
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
/**************************************************************/
// ad_user()
// Input event; called by ad_admin and when admin's USER button clicked.
// Display user admin screen
// Input:  n/a
// Return: n/a
/**************************************************************/
export function ad_user() {
  console.log('%c ad_user(): ',
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  ad_alterClass('ad_btn', 'grey');
  document.getElementById("b_ad_user").style.backgroundColor = "cyan";
  ad_readAll(DETAILS, null, ad_processUSERReadAll);                     //<=======                  
}

/**************************************************************/
// aad_copy
// Input event; called when admin's GD button clicked
// Display GD (Bouncing Ball) admin screen
// Input:  n/a
// Return: n/a
/**************************************************************/
export function ad_copy() {
  console.log('%c ad_copy(): ',
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  ad_alterClass('ad_btn', 'grey');
  document.getElementById("b_ad_GD").style.backgroundColor   = "cyan";
  ad_readAll(GD, null, ad_processGDReadAll);                            //<=======           
}

/**************************************************************/
// ad_SI()
// Input event; called when admin's SI button clicked
// Display SI (Space Invaders) admin screen
// Input:  n/a
// Return: n/a
/**************************************************************/
export function ad_SI() {
  console.log('%c ad_SI(): ',
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
  
  ad_alterClass('ad_btn', 'grey');
  document.getElementById("b_ad_SI").style.backgroundColor   = "cyan";
  ad_readAll(SI, null, ad_processSIReadAll);                            //<=======
}

/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
// ad_manager functions to process readAll results
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
/**************************************************************/
// ad_processUSERReadAll(_result, _path,  _snapshot, _save, _error)
// Called by ad_readAll() to handle result of read ALL USER records request.
// Save data & update display with record info
// Input:  result('waiting', 'OK', 'error'), path, 
//         snapshot, where to save it & error msg if any
//         NOTE: This is the raw data, EG snapshot, and
//                NOT the output from snapshot.val()
// Return: n/a
/**************************************************************/
//                   _procFunc(_result, _path,  _snapshot, _save, _error)
function ad_processUSERReadAll(_result, _path,  _snapshot, _save, _error) {
  console.log('%c ad_processUSERReadAll result= ' + _result, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  // Update interface's readAll result                                 
  sessionStorage.setItem('fb_readAllStatus', _result);                                        
  let para = document.getElementById("p_fbReadAll");
  
  // Note: if read was successful, _result  must = "OK"                
  let ad_adminArray = [];
  if (_result == 'OK') {
    if (para) {
      para.textContent = _result;
      para.style.color = 'black';    // Reset colour to black
    } 
    let childKey;
    let childData;

    if (_snapshot.val() != null) {
      _snapshot.forEach(function(childSnapshot) {
        childKey = childSnapshot.key;
        childData = childSnapshot.val();
        //console.log(Object.keys(childData));                          //DIAG

        // ENSURE THE FIELDS YOU PUSH INTO THE ARRAY OF OBJECTS         //<=======
        //  MATCH YOUR FIREBASE RECORDS FOR THE PATH                    //<=======
        ad_adminArray.push({     
          displayName:  childData.displayName,
          email:        childData.email,
          // Left photoURL out as its so long the table will be too wide for the screen
          //photoURL:   childData.photoURL,  
          gameName:     childData.gameName,
          uid:          childKey
        });
      });
    }
  } else if (_result == 'no record') {
    ad_adminArray.push({     
      uid:      'no records'
    });
    if (para) {
      para.textContent = _result;
      para.style.color = 'black';    // Reset colour to black
    } 
  }
  else {
    ad_adminArray.push({     
      uid:      'Database read ERROR: see console for details'
    });
    console.error('Database read error for ' + _path + '\n' + _error);
    if (para) {
      para.textContent = _result;
      para.style.color = 'red';   
    } 
  }
     
  // build & display user data
  // MAKE SURE THE FOLOWING PARAMETERS ARE CORRECT. PARAMETER:          //<=======
  //  7 = COLUMMN NUMBER WHICH CONTAINS THE DATABASE KEY.               //<=======
  //  8 = DATABASE PATH THE RECORDS WERE READ FROM.                     //<=======
  ad_displayAll("t_userData", ad_adminArray, true, "", "", "", 
                4, DETAILS);                                            //<=======
}

/**************************************************************/
// ad_processGDReadAll(_result, _path,  _snapshot, _save, _error)
// Called by ad_readAll() to handle result of read ALL GD records request.
// Save data & update display with record info
// Input:  result('waiting', 'OK', 'error'), path, 
//         snapshot, where to save it & error msg if any
//         NOTE: This is the raw data, EG snapshot, and
//                NOT the output from snapshot.val()
// Return: n/a
/**************************************************************/
//                 _procFunc(_result, _path, _snapshot, _save, _error)
function ad_processGDReadAll(_result, _path, _snapshot, _save, _error) {
  console.log('%c ad_processGDReadAll(): result= ' + _result, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  // Update interface's readAll result                                 
  sessionStorage.setItem('fb_readAllStatus', _result);                                        
  let para = document.getElementById("p_fbReadAll");
  
  // Note: if read was successful, _result  must = "OK"                
  let ad_adminArray = [];
  if (_result == 'OK') {
    if (para) {
      para.textContent = _result;
      para.style.color = 'black';    // Reset colour to black
    } 
    let childKey;
    let childData;

    if (_snapshot.val() != null) {
      _snapshot.forEach(function(childSnapshot) {
        childKey = childSnapshot.key;
        childData = childSnapshot.val();
        //console.log(Object.keys(childData));                          //DIAG  

        // ENSURE THE FIELDS YOU PUSH INTO THE ARRAY OF OBJECTS         //<=======
        //  MATCH YOUR FIREBASE RECORDS FOR THE PATH                    //<=======
        ad_adminArray.push({     
          uid:      childKey,
          gameName: childData.gameName,
          time:     childData.time
        });
      });
    }
  } else if (_result == 'no record') {
    ad_adminArray.push({     
      uid:      'no records'
    });
    if (para) {
      para.textContent = _result;
      para.style.color = 'black';    // Reset colour to black
    } 
  }
  else {
    ad_adminArray.push({     
      uid:      'Database read ERROR: see console for details'
    });
    console.error('Database read error for ' + _path + '\n' + _error);
    if (para) {
      para.textContent = _result;
      para.style.color = 'red';   
    } 
  }
      
  // build & display user data
  // MAKE SURE THE FOLOWING PARAMETERS ARE CORRECT. PARAMETER:          //<=======
  //  7 = COLUMMN NUMBER WHICH CONTAINS THE DATABASE KEY.               //<=======
  //  8 = DATABASE PATH THE RECORDS WERE READ FROM.                     //<=======
  ad_displayAll("t_userData", ad_adminArray, true, "", "", "", 
                1, GD);                                                 //<=======
}

/**************************************************************/
// ad_processSIReadAll(_result, _path,  _snapshot, _save, _error)
// Called by ad_readAll() to handle result of read ALL SI records request.
// Save data & update display with record info
// Input:  result('waiting', 'OK', 'error'), path, 
//         snapshot, where to save it & error msg if any
//         NOTE: This is the raw data, EG snapshot, and
//                NOT the output from snapshot.val()
// Return: n/a
/**************************************************************/
//                 _procFunc(_result, _path, _snapshot, _save, _error)
function ad_processSIReadAll(_result, _path, _snapshot, _save, _error) {
  console.log('%c ad_processSIReadAll(): result= ' + _result, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  // Update interface's readAll result                                 
  sessionStorage.setItem('fb_readAllStatus', _result);                                            
  let para = document.getElementById("p_fbReadAll");
  
  // Note: if read was successful, _result  must = "OK"                
  let ad_adminArray = [];
  if (_result == 'OK') {
    if (para) {
      para.textContent = _result;
      para.style.color = 'black';    // Reset colour to black
    } 
    let childKey;
    let childData;

    if (_snapshot.val() != null) {
      _snapshot.forEach(function(childSnapshot) {
        childKey = childSnapshot.key;
        childData = childSnapshot.val();
        //console.log(Object.keys(childData));                          //DIAG

        // ENSURE THE FIELDS YOU PUSH INTO THE ARRAY OF OBJECTS         //<=======
        //  MATCH YOUR FIREBASE RECORDS FOR THE PATH                    //<=======
        ad_adminArray.push({     
          uid:      childKey,
          gameName: childData.gameName,
          time:     childData.time
        });
      });
    }
  } else if (_result == 'no record') {
    ad_adminArray.push({     
      uid:      'no records'
    });
    if (para) {
      para.textContent = _result;
      para.style.color = 'black';    // Reset colour to black
    } 
  }
  else {
    ad_adminArray.push({     
      uid:      'Database read ERROR: see console for details'
    });
    console.error('Database read error for ' + _path + '\n' + _error);
    if (para) {
      para.textContent = _result;
      para.style.color = 'red';    // Reset colour to black
    } 
  }

  // build & display user data
  // MAKE SURE THE FOLOWING PARAMETERS ARE CORRECT. PARAMETER:          //<=======
  //  7 = COLUMMN NUMBER WHICH CONTAINS THE DATABASE KEY.               //<=======
  //  8 = DATABASE PATH THE RECORDS WERE READ FROM.                     //<=======
  ad_displayAll("t_userData", ad_adminArray, true, "", "", "", 
                1, SI);                                                 //<=======
}

/**************************************************************/
// ad_userInput(_feildName, _data)
// Called by finishTdEdit()
// Validate numeric data & convert string number input to numerics
// Input:  DB field name and user input
// Return: if validation ok: [true, numeric user input] else: [false, user input]
/**************************************************************/
function ad_userInput(_feildName, _data) {
  console.log('%c ad_userInput(): _feildName = ' + _feildName + 
              ',  _data = ' + _data, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  // Set up data types; 'a' for alphabetic,   'n' for numeric  &  'b' for both
  // ENSURE THE FIELDS BELOW MATCH YOUR DB FILEDS                       //<=======
  //   AND THE DATATYPE IS CORRECTLY SET                                //<=======
  let vd_dataTypes = {            
    displayName:  'a',
	  email:       'b',
    // Left photoURL out - its so long the table will be too wide for screen
    //photoURL:   'b', 
    gameName:     'b',
    phone:        'n',
    age:          'n',
    uid:          'b',
 
    gameName:     'b',
    time:         'n'
  };
    
  if (vd_dataTypes[_feildName] == 'n') {
    let temp = Number(_data); 
    if (isNaN(temp)) {
      return [false, _data];
    }  
    return [true, temp];
  } 

  else {
    return [true, _data];
  }
}

// Add this at the top of your event listeners

// Similarly, protect the initial load

//================================================================================ 
//        YOU SHOULD NOT ALTER ANY OF THE CODE BELOW                    //<=======
//        YOU SHOULD NOT ALTER ANY OF THE CODE BELOW                    //<=======
//        YOU SHOULD NOT ALTER ANY OF THE CODE BELOW                    //<=======
//        YOU SHOULD NOT ALTER ANY OF THE CODE BELOW                    //<=======
//================================================================================
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
// ad_manager general functions
/*++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++*/
/**************************************************************/
// ad_readAll(_path, _save, _procFunc)
// Read ALL records in a path
// Input:  path to read, where to save it &
//         function to process data
// Return: n/a
/**************************************************************/
function ad_readAll(_path, _save, _procFunc) {
    console.log('%c ad_readAll(): path= ' + _path,
                'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

    let fb_temp = 'waiting';
    
    const FB_DB = getDatabase();                                        //<=MODULAR-API
    const FB_DBREF = ref(FB_DB, _path)                                  //<=MODULAR-API
    get(FB_DBREF).then((snapshot) => {
        let fb_data = snapshot.val();
        if (fb_data != null) { 
            fb_temp = 'OK';
        } else {
            fb_temp = 'no record';
        }
        _procFunc(fb_temp, _path, snapshot, _save, null);
    }).catch((error) => {
        _procFunc('error', _path, null, _save, error);
    });
}

/**************************************************************/
// ad_alterClass(_class, _colour)
// Called by various
// Alter classes colour
// Input:  html class to act on & the colour to set it to
// Return: n/a
/**************************************************************/
function ad_alterClass(_class, _colour) {
  console.log('%c ad_alterClass(): class= ' + _class + 
              ' / colour= ' + _colour, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  let element = document.getElementsByClassName(_class);
  for (let i = 0; i < element.length; i++) {
    element[i].style.backgroundColor = _colour;  
  }
}

/**************************************************************/
// ad_displayAll(_tableId, _array, _action, _hideId, _showId, _path)
// Called by ad_process??ReadAll()
// Display all user records screen:
//    1. optionaly hide other screen & display the admin screen.
//    2. empty the html table.
//    3. dyanmicaly build html table & display all records. 
// Input:  1. html table id to dynamicaly build and populate.
//         2. data (an array of objects) to add to the table.
//         3. add DELETE & MODIFY capability to the table (true OR false).
//         4. to hide the previous screen, supply the html ids
//           of the associated divs to hide it OR leave them empty ''
//         5. to show the admin screen, supply the html id
//           of the associated div to show it OR leave empty ''
//         6. table item number containing the db key.
//         7. firebase path for delete capability.
// Return: n/a
//
// V01: Initial version
// v02: Add delete & update code
//
// Example call of ad_displayAll:
//  ad_displayAll("t_userData", dbArray, true, "landingPage", "", "adminPage", 
//                1, DETAILS);
/**************************************************************/
function ad_displayAll(_tableId, _array, _action, _hideId1, _hideId2, _showId, _item, _path) {
  console.log('%c ad_displayAll(): ',
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  // Optionaly hide html divs and show another html div
  if (_hideId1 != null && _hideId1 != "") {
    document.getElementById(_hideId1).style.display = "none";
  }
  if (_hideId2 != null && _hideId2 != "") {
    document.getElementById(_hideId2).style.display = "none";
  }
  if (_showId != null && _showId != "") {
    document.getElementById(_showId).style.display = "block";
  }

  // Ensure the html table is empty before we start
  if (document.getElementById(_tableId).rows.length > 0) {
    document.getElementById(_tableId).innerHTML = "";
  }

  let tableInfo = document.getElementById(_tableId); //Get info on target table

  if (_array.length > 0) { // Only if there is data
    let fieldNames = Object.keys(_array[0]); //Get header from 1st entry 

    /******************************************/                        //DIAG
    console.groupCollapsed('Expand to display _array[0]: ');            //DIAG
    console.log(_array[0]);                                             //DIAG
    console.log('fieldNames= ' + fieldNames);                           //DIAG
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^');                          //DIAG
    console.groupEnd();                                                 //DIAG
    /******************************************/                        //DIAG

    // Dynamically build html table & display the data
    ad_genTableEntry(tableInfo, _array, _action, _tableId, _item, _path);
    ad_genTableHead(tableInfo, fieldNames, _action);

    ad_clickEditCell(_tableId, _item, _path); // Make cells editable
  }
}

/**************************************************************/
// ad_genTableHead(_tableInfo, _fieldNames, _action)
// Called by ad_displayAll()
// Create table header
// Input:  table & object array of data 
//         if _action = true, then add action column
// Return: n/a
/**************************************************************/
function ad_genTableHead(_tableInfo, _fieldNames, _action) {
  console.log('%c ad_genTableHead(): ',
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
  
  let thead = _tableInfo.createTHead();
  let row = thead.insertRow();

  // Optionaly create ACTION header
  if (_action != null && _action != "") {
    let th = document.createElement("th");
    let text = document.createTextNode("action");
    th.appendChild(text);
    row.appendChild(th);
  }

  // Loop thru array of object's field names creating header for entry each
  for (let key of _fieldNames) {
    let th = document.createElement("th");
    let text = document.createTextNode(key);
    th.appendChild(text);
    row.appendChild(th);
  }
}

/**************************************************************/
// ad_genTableEntry(_tableInfo, _array, _action, _tableId, _item, _path)
// Called by ad_displayAll()
// Create table entries
// Input:  table & object array of data
//         if _action = true, then add DELETE button
//         table id & table item number containing db key
//         db path
// Return: n/a
/**************************************************************/
function ad_genTableEntry(_tableInfo, _array, _action, _tableId, _item, _path) {
  console.log('%c ad_genTableEntry(): ',
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
  
  // Loop thru array of object's data creating cell for entry each
  for (let element of _array) {
    let row = _tableInfo.insertRow();
    // Optionaly create ACTION cell
    if (_action != null && _action != "") {
      // add a button control.
      let button = document.createElement('input');

      // set the attributes.
      button.setAttribute('type',  'button');
      button.setAttribute('value', 'Delete');

      // add button's "onclick" event.         
      button.addEventListener("click", function() {
        ad_dbDelRec(_tableId, this, _item, _path);
      });
      let cell = row.insertCell();
      cell.appendChild(button);
    }

    for (let key in element) {
      let cell = row.insertCell();
      let text = document.createTextNode(element[key]);
      cell.appendChild(text);
    }
  }
}

/**************************************************************/
// ad_clickEditCell(_tableId _item, _path)
// Called by user clicking on a table's cell
// Edit the cell's data except for cell 0.
// Input:  table id
// Return: n/a
/**************************************************************/
function ad_clickEditCell(_tableId, _item, _path) {
  console.log('%c ad_clickEditCell(): path = ' + _path + 
              ', item = ' + _item, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
  
  let table = document.getElementById(_tableId);
  let editingTd;
  let cell;
  let row;
  let dbKey;
  let dbFieldName;

  //document.querySelector("table").addEventListener("click", function(event) {
  table.onclick = function(event) { 
    //console.log('%c ad_clickEditCell', 'click event called. path = ' +
    //           _path, 'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';'); 
    // 4 possible targets:                
    let target = event.target.closest('.edit-cancel,.edit-ok,td');

    if (!table.contains(target)) return;

    if (target.className == 'edit-cancel') {
      finishTdEdit(editingTd.elem, false);
    } else if (target.className == 'edit-ok') {
      finishTdEdit(editingTd.elem, true, _path, dbKey, dbFieldName);
    } else if (target.nodeName == 'TD') {
      if (editingTd) return; // already editing
      if (typeof event.target.cellIndex == 'undefined') return;

      cell = event.target.cellIndex;
      row = target.parentNode.rowIndex;
      dbKey = table.rows[row].cells[_item].innerHTML;
      dbFieldName = table.rows[0].cells[cell].innerHTML;

      makeTdEditable(target);
    }
  }

  function makeTdEditable(td) {
    editingTd = {
      elem: td,
      data: td.innerHTML
    };

    td.classList.add('edit-td'); // td is in edit state, CSS also styles the area inside

    let textArea = document.createElement('textarea');
    textArea.style.width  = td.clientWidth + 'px';
    textArea.style.height = td.clientHeight + 'px';
    textArea.className = 'edit-area';

    textArea.value = td.innerHTML;
    td.innerHTML = '';
    td.appendChild(textArea);
    textArea.focus();

    td.insertAdjacentHTML("beforeEnd",
      '<div class="edit-controls"><button class="edit-ok">OK' + 
      '</button><button class="edit-cancel">CANCEL</button></div>'
    );
  }

  function finishTdEdit(td, isOk, _path, _dbKey, _dbFieldName) {
    if (isOk) {
      td.innerHTML = td.firstChild.value;
      console.log('%c finishTdEdit(): path/key = ' + _path + '/' + 
                  _dbKey + ',  field name = ' + _dbFieldName + 
                  ', data = ' + td.innerHTML, 
                  'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
                  
      let data = {};
      let rtn  = [];      
      rtn  = ad_userInput(_dbFieldName, td.innerHTML);
      if (rtn[0]) {        // User input validated ok?
        data[_dbFieldName] = rtn[1];
        console.log('%c finishTdEdit(): td.innerHTML = ' + rtn[1] + 
                    '  type = ' + typeof(rtn[1]), 
                    'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
                   
        td.style.background = 'red';
        ad_dbUpdateRec(_path, _dbKey, _dbFieldName, data, td);
      }
      else {               // User input failed validation
        td.style.background = 'red';
        // Update interface's write result                                
        sessionStorage.setItem('fb_writeRecStatus', 'error');             
        let para = document.getElementById("p_fbWriteRec");
        if (para) {
          para.textContent = "error";
          para.style.color = 'red';
        }   
        console.error('finishTdEdit(): validation failed for ' + rtn[1] + 
                      '  type = ' + typeof(rtn[1]));
        alert ('Database validation error; see console log for details');
      }
    } 
    else {
      td.innerHTML = editingTd.data;
    }
    td.classList.remove('edit-td');
    editingTd = null;
  }
}

/**************************************************************/
// ad_dbUpdateRec(_tableId, _row, _item, _path)
// Called by finishTdEdit() when user clicks OK button
// Update the associated record from firebase
// Input:  path, key, field name, data & td object
// Return: n/a
/**************************************************************/
function ad_dbUpdateRec(_path, _dbKey, _dbFieldName, _data, _td) {
  console.log('%c ad_dbUpdateRec(): _path/_dbKey = ' + _path + '/' + 
              _dbKey + ',  _dbFieldName = ' + _dbFieldName + 
              ',  _data = ' + _data + '  _td = ' + _td, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  const FB_DB = getDatabase();                                          //<=MODULAR-API
  const FB_DBREF = ref(FB_DB, _path + '/' + _dbKey)                     //<=MODULAR-API
  update(FB_DBREF, _data).then(function() {                             //<=MODULAR-API
    _td.style.background = 'Azure';
    console.log('%c ad_dbUpdateRec(): Update succeeded for ' + 
                _path + '/' + _dbKey, 
                'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
    // Update interface's write result                                
    sessionStorage.setItem('fb_writeRecStatus', 'OK');  
    let para = document.getElementById("p_fbWriteRec");
    if (para) {
      para.textContent = 'OK';
      para.style.color = 'black'; // Reset colour to black
    }     
    //ad_delRow(_tableId, _row, item, _path);                           //DIAG
  })                                                                    //<=MODULAR-API
  .catch(function(error) {                                              //<=MODULAR-API
    // Update interface's write result                                
    sessionStorage.setItem('fb_writeRecStatus', 'error');             
    let para = document.getElementById("p_fbWriteRec");
    if (para) {
      para.textContent = "error";
      para.style.color = 'red';
    }                           
    console.error('ad_dbUpdateRec(): Update failed for ' + _path + 
                '/' + _dbKey + ': ' + error.message);
    alert ('Database write error; see console log for details');
  });                                                                   //<=MODULAR-API
}

/**************************************************************/
// ad_dbDelRec(_tableId, _row, _item, _path)
// Called when user clicks DELETE button
// Delete the associated record from firebase
// Input:  html table id, row & item number of firebase key and firebase path 
// Return: n/a
/**************************************************************/
function ad_dbDelRec(_tableId, _row, _item, _path) {
  console.log('%c ad_dbDelRec(): _tableId/_row = ' + _tableId + '/' + _row + 
              ',  _item = ' + _item + ',  _path = ' + _path, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
  
  let i = _row.parentNode.parentNode.rowIndex;
  let key = document.getElementById(_tableId).rows[i].cells.item(_item).innerHTML;
  console.log('%c ad_dbDelRec(): db path/key = ' + _path + '/' + key, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

  const FB_DB = getDatabase();                                          //<=MODULAR-API
  const FB_DBREF = ref(FB_DB, _path + '/' + key)                        //<=MODULAR-API
  remove(FB_DBREF).then(function() {                                    //<=MODULAR-API
    console.log('%c ad_dbDelRec(): Remove succeeded for ' + _path + '/' + key,
                'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
    // Update interface's write result                                 
    sessionStorage.setItem('fb_writeRecStatus', 'OK');  
    let para = document.getElementById("p_fbWriteRec");
    if (para) {
      para.textContent = 'OK';
      para.style.color = 'black'; // Reset colour to black
    }                                
    ad_delRow(_tableId, _row);
  })                                                                    //<=MODULAR-API
  .catch(function(error) {                                              //<=MODULAR-API
    // Update interface's write result                                 
    sessionStorage.setItem('fb_writeRecStatus', 'error');      
    let para = document.getElementById("p_fbWriteRec");
    if (para) {
      para.textContent = "error";
      para.style.color = 'red';
    }           
    console.error('ad_dbDelRec(): Remove failed for ' + _path + '/' +
                  key + ': ' + error.message);
    alert ('Database delete error; see console log for details');
  });                                                                   //<=MODULAR-API
}

/**************************************************************/
// ad_delRow(_tableId, _row)
// Called by ad_dbDelRec() when user clicks DELETE button
// Delete a row from a table
// Input:  table id & row to delete
// Return:
/**************************************************************/
function ad_delRow(_tableId, _row) {
  console.log('%c ad_delRow(): _tableId/_row = ' + _tableId + '/' + _row, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
  
  let i = _row.parentNode.parentNode.rowIndex;
  console.log('%c ad_delRow(): i = ' + i, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
  document.getElementById(_tableId).deleteRow(i);
}

/**************************************************************/
// ad_enterEvent(_tableId)
// Called by user entering data in a table's cell
// Display the cell's data
// Input:  table id
// Return: n/a
/**************************************************************/
function ad_enterEvent(_tableId) {
  console.log('%c ad_enterEvent(): _tableId = ' + _tableId, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
    
  // Listen for typing into a cell - display what is being typed into the cell.
  document.getElementById(_tableId).addEventListener("input", function(event) {
    let td = event.target;
    while (td !== this && !td.matches("td")) {
      td = td.parentNode;
    }

    if (td === this) {
      console.log('%c ad_dbRAllUResult(): enter - No table cell found', 
                  'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
    } else {
      console.log('%c ad_dbRAllUResult(): enter - cell= ' + td.innerHTML, 
                  'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');

      if (td.innerHTML == 'd') {
        //document.getElementById(_tableId).deleteRow(2);
      }
    }
  });
}

/**************************************************************/
// ad_clickCell(_tableId)
// Called by user clicking on a table's cell
// Edit the cell's data
// Input:  table id
// Return: n/a
/**************************************************************/
function ad_clickCell(_tableId) {
  console.log('%c ad_clickCell(): _tableId = ' + _tableId, 
              'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
   
  // Click on cell to display its contents
  document.querySelector("table").addEventListener("click", function(event) {
    let td = event.target;
    while (td !== this && !td.matches("td")) {
      td = td.parentNode;
    }
    if (td === this) {
      console.log('%c ad_dbRAllUResult(): click - No table cell found', 
                  'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
    } else {
      console.log('%c ad_dbRAllUResult(): click - cell= ' + td.innerHTML, 
                  'color: ' + AD_COL_C + '; background-color: ' + AD_COL_B + ';');
    }
  });
}         

/**************************************************************/
//  END OF APP
/**************************************************************/