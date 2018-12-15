'use strict';

//==============================================================================
//Global variables

const fs = require('fs');
const NewworldDB = require('./newworldDB');
const db = new NewworldDB();

//==============================================================================
//DB Functions

function createMyDB(){
  //create tables
  let tableObjs = JSON.parse(fs.readFileSync('database/objects/auctionInitialTables.json', 'utf8'));
  tableObjs.forEach(db.createTable, db); // <-- second parameter specifies what "this." variable should reference
  //insert records
  let insertObjs = JSON.parse(fs.readFileSync('database/objects/auctionInitialInserts.json', 'utf8'));
  insertObjs.forEach(db.insertRecord, db); // <-- second parameter specifies what "this." variable should reference
}

//==============================================================================
//DB Testing

//reset db
db.openDatabase("auctionDB");
db.deleteDatabase();

//create tables
db.openDatabase("auctionDB");
createMyDB();

//==============================================================================
//Notes

/*
So we've got a bunch of types so far:
Boolean (Integer)
Integer
Text
Date (Text)
Money (Integer)
*/

/*
Atom shortcut for collapse all when viewing JSON:
CTRL + ALT + SHIFT + '['
*/
