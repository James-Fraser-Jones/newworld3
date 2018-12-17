'use strict';

//==============================================================================
//Global variables

const fs = require('fs');
const NewworldDB = require('./newworldDB');
const db = new NewworldDB();

//==============================================================================
//DB Testing

//reset db
db.openDatabase("auctionDB");
db.deleteDatabase();

//create tables
db.createDatabase("auctionDB");

//insert a null value into a non-null field
let testInsert = {tableName:"Bod", fieldNames:["PermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[1, "James", "Fraser-Jones", null, null, null]};
db.insertRecord(testInsert);
console.log(testInsert);

//update a non-null field with null
let testUpdate = {tableName:"Bod", fieldName:"FirstName", pkID:2, value:null};
db.updateCell(testUpdate);
console.log(testUpdate);

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
