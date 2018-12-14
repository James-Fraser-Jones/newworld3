'use strict';

//==============================================================================
//Global variables

const fs = require('fs');
const Database = require('better-sqlite3');

const helperDB = require('./helperDB');
const newworldDB = require('./newworldDB');

var db = null; //global database reference

//==============================================================================
//DB creation (using db and helper modules)

function createMyDB(){
  let dbName = "auctionDB";

  let dbObj = helperDB.create(dbName);

  let permission = helperDB.addTable(dbObj, "Permission", false);
  helperDB.addField(permission, "Name", helperDB.type.TEXT, false, false, null, null, null);

  let bod = helperDB.addTable(dbObj, "Bod", true);
  helperDB.addField(bod, "PermissionID", helperDB.type.INTEGER, false, false, null, null, "Permission");
  helperDB.addField(bod, "FirstName", helperDB.type.TEXT, false, false, null, null, null);
  helperDB.addField(bod, "LastName", helperDB.type.TEXT, false, false, null, null, null);
  helperDB.addField(bod, "ContactNum", helperDB.type.TEXT, false, false, null, null, null);
  helperDB.addField(bod, "Email", helperDB.type.TEXT, false, false, null, null, null);
  helperDB.addField(bod, "Address", helperDB.type.TEXT, true, false, null, null, null);

  let item = helperDB.addTable(dbObj, "Item", true);
  helperDB.addField(item, "OwnerID", helperDB.type.INTEGER, false, false, null, null, "Bod");
  helperDB.addField(item, "Name", helperDB.type.TEXT, false, false, null, null, null);
  helperDB.addField(item, "Desc", helperDB.type.TEXT, false, false, null, null, null);

  let auction = helperDB.addTable(dbObj, "Auction", true);
  helperDB.addField(auction, "Address", helperDB.type.TEXT, false, false, null, null, null);
  helperDB.addField(auction, "Start", helperDB.type.TEXT, false, false, null, null, null);
  helperDB.addField(auction, "End", helperDB.type.TEXT, false, false, null, null, null);

  let auctionItem = helperDB.addTable(dbObj, "AuctionItem", true);
  helperDB.addField(auctionItem, "AuctionID", helperDB.type.INTEGER, false, false, null, null, "Auction");
  helperDB.addField(auctionItem, "ItemID", helperDB.type.INTEGER, false, false, null, null, "Item");
  helperDB.addField(auctionItem, "TransactionID", helperDB.type.INTEGER, false, false, null, null, "Transaction");
  helperDB.addField(auctionItem, "AskingPrice", helperDB.type.INTEGER, false, false, null, null, null);
  helperDB.addField(auctionItem, "ReservePrice", helperDB.type.INTEGER, true, false, null, null, null);
  helperDB.addField(auctionItem, "PresaleBidPrice", helperDB.type.INTEGER, true, false, null, null, null);

  let transaction = helperDB.addTable(dbObj, "Transaction", true);
  helperDB.addField(transaction, "BuyerID", helperDB.type.INTEGER, false, false, null, null, "Bod");
  helperDB.addField(transaction, "SellerID", helperDB.type.INTEGER, false, false, null, null, "Bod");
  helperDB.addField(transaction, "ItemID", helperDB.type.INTEGER, false, false, null, null, "Item");
  helperDB.addField(transaction, "Price", helperDB.type.INTEGER, false, false, null, null, null);
  helperDB.addField(transaction, "Happened", helperDB.type.TEXT, false, false, null, null, null);
  helperDB.addField(transaction, "BeenPaid", helperDB.type.INTEGER, false, false, null, null, null);

  let initInsert =
  [{tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[1, "Admin"]},
   {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[2, "Manager"]},
   {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[3, "Employee"]},
   {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[4, "Customer"]},
   {tableName:"Bod", fieldNames:["PermissionID", "FirstName", "LastName", "ContactNum", "Email"], values:[1, "Admin", "Admin", "", ""]}];

  newworldDB.create(db, dbName, dbObj, initInsert);
}

createMyDB();

//==============================================================================
//DB Testing

// //test cell updating
// let exampleUpdates =
// [{tableName:"Bod", fieldName:"Email", pkID:1, value:"Mr Johnson"},
//  {tableName:"Bid", fieldName:"Address", pkID:1, value:55}];
// console.log("\nUpdate Test:\n");
// console.log(helperDB.update(db, exampleUpdates));
//
// //test row inserting
// let exampleInserts =
// [{tableName:"Bod", fieldNames:["PermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[1, "Alex", "Baby", "07940234567", "donkey@home.co.uk", "My house"]},
//  {tableName:"Bod", fieldNames:["BermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[2, "Johnny", "Rotten", "666", "dunkey@home.co.uk", "Peach's Castle"]}];
// console.log("\n\nInsert Test:\n");
// console.log(helperDB.insert(db, exampleInserts));
//
// //test row deletion
// let exampleDeletes =
// [{tableName:"Permission", pkID:3},
//  {tableName:"Parmission", pkID:4}];
// console.log("\n\nDelete Test:\n");
// console.log(helperDB.delete(db, exampleDeletes));

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

/*
New helperDB API:

 CreateTable :: DB -> (String, Bool, [(String, Int, Bool, Bool, a, String, String)]) -> IO Maybe Error
InsertRecord :: DB -> (String, [(String, a)])                                        -> IO (String, [(String, a)], Either Error Int)
  UpdateCell :: DB -> (String, String, Int, a)                                       -> IO (String, String, Int, a, Either Error a)
DeleteRecord :: DB -> (String, Int)                                                  -> IO (String, Int, Maybe Error)

These functions use the objects directly to represent these tuples.
Then just map these functions over Tables, URecords, Cells, DRecords objects, respectively, no need to create new functions for this.

Forget object making functions. Just have a static "Tables" JSON file for your database and access it via the filesystem when you want to
map "CreateTable" over it.

Print errors created by CreateTable to the console, errors from other functions will be captured and dealt with client side.

////////////////////////////////////////////////////////////////////////////////////

Other functions:

Generic file deleting function which can be used to delete database files.
OpenDatabase database wrapper function.
InitDatabase database function which takes a newly opened database and (attempts to) adds all the tables from the Tables.JSON file to it.

Might not need a CloseDatabase database wrapper funciton. (Need to test how this interacts with database file getting deleted etc..)
*/
