'use strict';

//==============================================================================
//Global variables

const fs = require('fs');
const Database = require('better-sqlite3');
var db;
var dbinfo;

//==============================================================================
//SQL Manipulation

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

//////////////////////////////////////////////////
//Exposed methods

function updateDB(updates){
  //make a clone of update object for returning
  let newupdates = JSON.parse(JSON.stringify(updates)); //this might be inefficient

  newupdates.map(updateCellObj);
  return newupdates;
}

function insertIntoDB(inserts){
  return inserts.map(insertRowObj);
}

function deleteFromDB(dels){
  return dels.map(deleteRowObj);
}

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
    console.log(err.toString());
  }
}

//==============================================================================
//SQL Representation

const sqliteType = {
  INTEGER : 1,
  TEXT : 2,
  BLOB : 3,
  REAL : 4,
  NUMERIC : 5
}

function getSqliteType(num){
  let values = Object.values(sqliteType);
  let i;
  for (i = 0; i < values.length; i++){
    if (num === values[i]){
      return Object.keys(sqliteType)[i];
    }
  }
  return null;
}

function makeField(name, type, nullable, unique, def, check, foreign){
  return {
    name: name,           //String
    type: type,           //sqliteType enum
    nullable: nullable,   //Boolean
    unique: unique,       //Boolean
    default: def,         //NULL or Value
    check: check,         //NULL or String
    foreign: foreign      //NULL or String
  };
}

function makeTable(name, autoinc){
  return {
    name: name,       //String
    autoinc: autoinc, //Boolean
    fields: []
  };
}

//////////////////////////////////////////////////
//Exposed methods

function makeDB(name){
  return {
    name: name, //String
    tables: []
  };
}

function addTable(db, name, autoinc){
  let newtable = makeTable(name, autoinc);
  db.tables.push(newtable);
  return newtable;
}

function addField(table, name, type, nullable, unique, def, check, foreign){
  table.fields.push(makeField(name, type, nullable, unique, def, check, foreign));
}

//==============================================================================
//SQL Generation

//wrap string values in single quotes, not necessary when utilizing prepared statements for value injection
function wrap(value){
  if ((typeof value) === "string"){
    return `'${value}'`;
  }
  return value;
}

function generateTableSQL(table){
  let pri = generatePrimary(table);
  let fi = table.fields.map(generateFieldSQL);
  let fo = table.fields.map(generateForeignSQL).filter(str => str !== "");
  let lines = fi.concat(fo);
  lines.unshift(pri);
  return `CREATE TABLE '${table.name}' (\n${lines.join(",\n")}\n);`;
}

function generatePrimary(table){
  return `  '${table.name}ID' INTEGER NOT NULL PRIMARY KEY ${table.autoinc ? "AUTOINCREMENT " : ""}UNIQUE`;
}

function generateFieldSQL(field){
  let words = [];
  words.push(`  '${field.name}'`);
  words.push(getSqliteType(field.type));
  if (!field.nullable){ words.push("NOT NULL") };
  if (field.default){ words.push(`DEFAULT ${wrap(field.default)}`) };
  if (field.check){ words.push(`CHECK (${field.check})`) };
  if (field.unique){ words.push("UNIQUE") };
  return words.join(" ");
}

function generateForeignSQL(field){
  return field.foreign ? `  FOREIGN KEY ('${field.name}') REFERENCES '${field.foreign}'(${field.foreign}ID)` : "";
}

//////////////////////////////////////////////////
//Exposed methods

function generateDBSQL(db){
  return db.tables.map(generateTableSQL).join("\n\n");
}

//==============================================================================
//SQL (specific to the auction db schema that I designed)

const auctionDB = makeDB("auctionDB");

const permission = addTable(auctionDB, "Permission", false);
addField(permission, "Name", sqliteType.TEXT, false, false, null, null, null);

const bod = addTable(auctionDB, "Bod", true);
addField(bod, "PermissionID", sqliteType.INTEGER, false, false, null, null, "Permission");
addField(bod, "FirstName", sqliteType.TEXT, false, false, null, null, null);
addField(bod, "LastName", sqliteType.TEXT, false, false, null, null, null);
addField(bod, "ContactNum", sqliteType.TEXT, false, false, null, null, null);
addField(bod, "Email", sqliteType.TEXT, false, false, null, null, null);
addField(bod, "Address", sqliteType.TEXT, true, false, null, null, null);

const item = addTable(auctionDB, "Item", true);
addField(item, "OwnerID", sqliteType.INTEGER, false, false, null, null, "Bod");
addField(item, "Name", sqliteType.TEXT, false, false, null, null, null);
addField(item, "Desc", sqliteType.TEXT, false, false, null, null, null);

const auction = addTable(auctionDB, "Auction", true);
addField(auction, "Address", sqliteType.TEXT, false, false, null, null, null);
addField(auction, "Start", sqliteType.TEXT, false, false, null, null, null);
addField(auction, "End", sqliteType.TEXT, false, false, null, null, null);

const auctionItem = addTable(auctionDB, "AuctionItem", true);
addField(auctionItem, "AuctionID", sqliteType.INTEGER, false, false, null, null, "Auction");
addField(auctionItem, "ItemID", sqliteType.INTEGER, false, false, null, null, "Item");
addField(auctionItem, "TransactionID", sqliteType.INTEGER, false, false, null, null, "Transaction");
addField(auctionItem, "AskingPrice", sqliteType.INTEGER, false, false, null, null, null);
addField(auctionItem, "ReservePrice", sqliteType.INTEGER, true, false, null, null, null);
addField(auctionItem, "PresaleBidPrice", sqliteType.INTEGER, true, false, null, null, null);

const transaction = addTable(auctionDB, "Transaction", true);
addField(transaction, "BuyerID", sqliteType.INTEGER, false, false, null, null, "Bod");
addField(transaction, "SellerID", sqliteType.INTEGER, false, false, null, null, "Bod");
addField(transaction, "ItemID", sqliteType.INTEGER, false, false, null, null, "Item");
addField(transaction, "Price", sqliteType.INTEGER, false, false, null, null, null);
addField(transaction, "Happened", sqliteType.TEXT, false, false, null, null, null);
addField(transaction, "BeenPaid", sqliteType.INTEGER, false, false, null, null, null);

const initInsert =
[{tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[1, "Admin"]},
 {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[2, "Manager"]},
 {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[3, "Employee"]},
 {tableName:"Permission", fieldNames:["PermissionID", "Name"], values:[4, "Customer"]},
 {tableName:"Bod", fieldNames:["PermissionID", "FirstName", "LastName", "ContactNum", "Email"], values:[1, "Admin", "Admin", "", ""]}];

//create and populate tables
function initAuctionDB(){
  db.exec(generateDBSQL(auctionDB));
  insertIntoDB(initInsert);
}

//==============================================================================
//Testing code

//set database setup
deleteDB("test1");
openDB("test1");
initAuctionDB();

// //test cell updating
// let exampleUpdates =
// [{tableName:"Bod", fieldName:"Email", pkID:1, value:"Mr Johnson"},
//  {tableName:"Bid", fieldName:"Address", pkID:1, value:55}];
// console.log("\nUpdate Test:\n");
// console.log(updateDB(exampleUpdates));
//
// //test row inserting
// let exampleInserts =
// [{tableName:"Bod", fieldNames:["PermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[1, "Alex", "Baby", "07940234567", "donkey@home.co.uk", "My house"]},
//  {tableName:"Bod", fieldNames:["BermissionID", "FirstName", "LastName", "ContactNum", "Email", "Address"], values:[2, "Johnny", "Rotten", "666", "dunkey@home.co.uk", "Peach's Castle"]}];
// console.log("\n\nInsert Test:\n");
// console.log(insertIntoDB(exampleInserts));
//
// //test row deletion
// let exampleDeletes =
// [{tableName:"Permission", pkID:3},
//  {tableName:"Parmission", pkID:4}];
// console.log("\n\nDelete Test:\n");
// console.log(deleteFromDB(exampleDeletes));
//
// //test sql generation
// console.log("\n\nPermission Table:\n");
// console.log(generateTableSQL(permissionTable));
// console.log("\n\nBod Table:\n");
// console.log(generateTableSQL(bodTable));
// console.log("\n\nItem Table:\n");
// console.log(generateTableSQL(itemTable));
// console.log("\n\nAuction Table:\n");
// console.log(generateTableSQL(auctionTable));
// console.log("\n\nAuctionItem Table:\n");
// console.log(generateTableSQL(auctionitemTable));
// console.log("\n\nTransaction Table:\n");
// console.log(generateTableSQL(transactionTable));

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
