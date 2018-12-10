'use strict';

//==============================================================================
//Global variables

const fs = require('fs');
const Database = require('better-sqlite3');
const helperDB = require('./helperDB');
var db; //global database reference

//==============================================================================
//Database access (using global database reference)

function openDB(dbName){
  db = new Database(`database/${dbName}.db`);
}

function closeDB(){
  if (db.open){
    db.close();
    db = undefined;
  }
}

function deleteDB(dbName){
  try {
    fs.unlinkSync(`database/${dbName}.db`);
  }
  catch (err) {
    console.log(err);
  }
}

//==============================================================================
//SQL (created using my helper module)

const auctionDB = helperDB.create("auctionDB");

const permission = helperDB.addTable(auctionDB, "Permission", false);
helperDB.addField(permission, "Name", helperDB.type.TEXT, false, false, null, null, null);

const bod = helperDB.addTable(auctionDB, "Bod", true);
helperDB.addField(bod, "PermissionID", helperDB.type.INTEGER, false, false, null, null, "Permission");
helperDB.addField(bod, "FirstName", helperDB.type.TEXT, false, false, null, null, null);
helperDB.addField(bod, "LastName", helperDB.type.TEXT, false, false, null, null, null);
helperDB.addField(bod, "ContactNum", helperDB.type.TEXT, false, false, null, null, null);
helperDB.addField(bod, "Email", helperDB.type.TEXT, false, false, null, null, null);
helperDB.addField(bod, "Address", helperDB.type.TEXT, true, false, null, null, null);

const item = helperDB.addTable(auctionDB, "Item", true);
helperDB.addField(item, "OwnerID", helperDB.type.INTEGER, false, false, null, null, "Bod");
helperDB.addField(item, "Name", helperDB.type.TEXT, false, false, null, null, null);
helperDB.addField(item, "Desc", helperDB.type.TEXT, false, false, null, null, null);

const auction = helperDB.addTable(auctionDB, "Auction", true);
helperDB.addField(auction, "Address", helperDB.type.TEXT, false, false, null, null, null);
helperDB.addField(auction, "Start", helperDB.type.TEXT, false, false, null, null, null);
helperDB.addField(auction, "End", helperDB.type.TEXT, false, false, null, null, null);

const auctionItem = helperDB.addTable(auctionDB, "AuctionItem", true);
helperDB.addField(auctionItem, "AuctionID", helperDB.type.INTEGER, false, false, null, null, "Auction");
helperDB.addField(auctionItem, "ItemID", helperDB.type.INTEGER, false, false, null, null, "Item");
helperDB.addField(auctionItem, "TransactionID", helperDB.type.INTEGER, false, false, null, null, "Transaction");
helperDB.addField(auctionItem, "AskingPrice", helperDB.type.INTEGER, false, false, null, null, null);
helperDB.addField(auctionItem, "ReservePrice", helperDB.type.INTEGER, true, false, null, null, null);
helperDB.addField(auctionItem, "PresaleBidPrice", helperDB.type.INTEGER, true, false, null, null, null);

const transaction = helperDB.addTable(auctionDB, "Transaction", true);
helperDB.addField(transaction, "BuyerID", helperDB.type.INTEGER, false, false, null, null, "Bod");
helperDB.addField(transaction, "SellerID", helperDB.type.INTEGER, false, false, null, null, "Bod");
helperDB.addField(transaction, "ItemID", helperDB.type.INTEGER, false, false, null, null, "Item");
helperDB.addField(transaction, "Price", helperDB.type.INTEGER, false, false, null, null, null);
helperDB.addField(transaction, "Happened", helperDB.type.TEXT, false, false, null, null, null);
helperDB.addField(transaction, "BeenPaid", helperDB.type.INTEGER, false, false, null, null, null);

const initInsert =
[{tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[1, "Admin"]},
 {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[2, "Manager"]},
 {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[3, "Employee"]},
 {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[4, "Customer"]},
 {tableName:"Bod", fieldNames:["PermissionID", "FirstName", "LastName", "ContactNum", "Email"], values:[1, "Admin", "Admin", "", ""]}];

//==============================================================================
//Testing code

//set database setup
deleteDB("test1");
openDB("test1");
console.log(helperDB.generate(db, auctionDB));
console.log(helperDB.insert(db, initInsert));

//test cell updating
let exampleUpdates =
[{tableName:"Bod", fieldName:"Email", pkID:1, value:"Mr Johnson"},
 {tableName:"Bid", fieldName:"Address", pkID:1, value:55}];
console.log("\nUpdate Test:\n");
console.log(helperDB.update(db, exampleUpdates));

//test row inserting
let exampleInserts =
[{tableName:"Bod", fieldNames:["PermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[1, "Alex", "Baby", "07940234567", "donkey@home.co.uk", "My house"]},
 {tableName:"Bod", fieldNames:["BermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[2, "Johnny", "Rotten", "666", "dunkey@home.co.uk", "Peach's Castle"]}];
console.log("\n\nInsert Test:\n");
console.log(helperDB.insert(db, exampleInserts));

//test row deletion
let exampleDeletes =
[{tableName:"Permission", pkID:3},
 {tableName:"Parmission", pkID:4}];
console.log("\n\nDelete Test:\n");
console.log(helperDB.delete(db, exampleDeletes));

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
