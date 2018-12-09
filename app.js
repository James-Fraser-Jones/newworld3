'use strict';

//==============================================================================
//Global variables

const fs = require('fs');
const Database = require('better-sqlite3');
var db;

//==============================================================================
//Functions

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
  fs.unlinkSync(`database/${dbName}.db`);
}

//////////////////////////////////////
//Delete

function deleteFromDB(dels){
  return dels.map(deleteRowObj);
}

function deleteRowObj(del){
  return deleteRow(del.tableName, del.pkID);
}

function deleteRow(tableName, pkID){
  //attempt delete, or return error
  try{
    let preparedDelete = db.prepare(`DELETE FROM ${tableName} WHERE ${tableName}ID = ?`);
    return preparedDelete.run(pkID).changes;
  }
  catch (err){
    return err;
  }
}

//////////////////////////////////////
//Insert

function insertIntoDB(inserts){
  return inserts.map(insertRowObj);
}

function insertRowObj(insert){
  return insertRow(insert.tableName, insert.fieldNames, insert.values);
}

function insertRow(tableName, fieldNames, values){
  //attempt insert, or return error
  try{
    let preparedInsert = db.prepare(`INSERT INTO ${tableName}(${fieldNames.join(",")}) VALUES (${values.map(() => "?").join(",")})`);
    return preparedInsert.run(values).lastInsertRowid;
  }
  catch (err){
    return err;
  }
}

//////////////////////////////////////
//Update

function updateDB(updates){
  //make a clone of update object for returning
  let newupdates = JSON.parse(JSON.stringify(updates)); //this might be inefficient

  newupdates.map(updateCellObj);
  return newupdates;
}

function updateCellObj(update){
  update.value = updateCell(update.tableName, update.fieldName, update.pkID, update.value);
}

function updateCell(tableName, fieldName, pkID, value){
  //attempt update, or return error
  try{
    let preparedUpdate = db.prepare(`UPDATE ${tableName} SET ${fieldName} = ? WHERE ${tableName}ID = ?`);
    preparedUpdate.run(value, pkID);
  }
  catch (err){
    return err;
  }

  //attempt query, or return error
  try{
    let preparedQuery = db.prepare(`SELECT ${fieldName} FROM ${tableName} WHERE ${tableName}ID = ?`);
    return preparedQuery.get(pkID)[fieldName];
  }
  catch (err){
    return err;
  }
}

//////////////////////////////////////

function initAuctionDB(){
  //create tables
  db.exec(makePermission);
  db.exec(makeBod);
  db.exec(makeAuction);
  db.exec(makeItem);
  db.exec(makeTransaction);
  db.exec(makeAuctionItem);

  //populate tables
  db.exec(makePermissions);
  db.exec(makeAdminBod);
}

//==============================================================================
//SQL

const makePermissions =
`INSERT INTO Permission (PermissionID, PermissionName) VALUES
 (1, 'Admin'),
 (2, 'Manager'),
 (3, 'Employee'),
 (4, 'Customer');
`;

const makeAdminBod =
`INSERT INTO Bod (PermissionID, FirstName, LastName, ContactNum, Email) VALUES
 (1, 'Admin', 'Admin', '', '');
`;

//////////////////////////////////////

const makePermission =
`CREATE TABLE 'Permission' (
	'PermissionID'	INTEGER NOT NULL PRIMARY KEY UNIQUE,
	'PermissionName'	TEXT NOT NULL
);`;

const makeBod =
`CREATE TABLE 'Bod' (
	'BodID'	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
  'PermissionID'	INTEGER NOT NULL,
	'FirstName'	TEXT NOT NULL,
	'LastName'	TEXT NOT NULL,
	'ContactNum'	TEXT NOT NULL,
	'Email'	TEXT NOT NULL,
	'Address'	TEXT,
	FOREIGN KEY('PermissionID') REFERENCES Permission(PermissionID)
);`;

const makeAuction =
`CREATE TABLE 'Auction' (
	'AuctionID'	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	'Address'	TEXT NOT NULL,
	'Start'	TEXT NOT NULL,
	'End'	TEXT NOT NULL
);`;

const makeItem =
`CREATE TABLE 'Item' (
	'ItemID'	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
  'OwnerID'	INTEGER NOT NULL,
	'ItemName'	TEXT NOT NULL,
	'ItemDesc'	TEXT NOT NULL,
	FOREIGN KEY('OwnerID') REFERENCES Bod(BodID)
);`;

const makeTransaction =
`CREATE TABLE 'Transaction' (
	'TransactionID'	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	'BuyerID'	INTEGER NOT NULL,
	'SellerID'	INTEGER NOT NULL,
	'ItemID'	INTEGER NOT NULL,
	'Price'	INTEGER NOT NULL,
	'TransTime'	TEXT NOT NULL,
	'BeenPaidBool'	INTEGER NOT NULL,
	FOREIGN KEY('BuyerID') REFERENCES Bod(BodID),
	FOREIGN KEY('SellerID') REFERENCES Bod(BodID),
	FOREIGN KEY('ItemID') REFERENCES Item(ItemID)
);`;

const makeAuctionItem =
`CREATE TABLE 'AuctionItem' (
	'AuctionItemID'	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	'AuctionID'	INTEGER NOT NULL,
	'ItemID'	INTEGER NOT NULL,
	'TransactionID'	INTEGER NOT NULL,
	'AskingPrice'	INTEGER NOT NULL,
	'ReservePrice'	INTEGER,
	'PresaleBidPrice'	INTEGER,
	FOREIGN KEY('AuctionID') REFERENCES Auction(AuctionID),
	FOREIGN KEY('ItemID') REFERENCES Item(ItemID),
	FOREIGN KEY('TransactionID') REFERENCES 'Transaction'(TransactionID)
);`;

//==============================================================================
//Testing code

//set database setup
deleteDB("test1");
openDB("test1");
initAuctionDB();

//test cell updating
let exampleUpdates =
[{tableName:"Bod", fieldName:"Email", pkID:1, value:"Mr Johnson"},
 {tableName:"Bid", fieldName:"Address", pkID:1, value:55}];
console.log("\nUpdate Test:\n");
console.log(updateDB(exampleUpdates));

//test row inserting
let exampleInserts =
[{tableName:"Bod", fieldNames:["PermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[1, "Alex", "Baby", "07940234567", "donkey@home.co.uk", "My house"]},
 {tableName:"Bod", fieldNames:["BermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[2, "Johnny", "Rotten", "666", "dunkey@home.co.uk", "Peach's Castle"]}];
console.log("\n\nInsert Test:\n");
console.log(insertIntoDB(exampleInserts));

//test row deletion
let exampleDeletes =
[{tableName:"Permission", pkID:3},
 {tableName:"Parmission", pkID:4}];
console.log("\n\nDelete Test:\n");
console.log(deleteFromDB(exampleDeletes));
