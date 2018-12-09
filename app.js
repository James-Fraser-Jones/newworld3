'use strict';

//==============================================================================
//Global variables

const fs = require('fs');
const Database = require('better-sqlite3');
var db;
var dbinfo;

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
  try {
    fs.unlinkSync(`database/${dbName}.db`);
  }
  catch (err) {
    console.log(err.toString());
  }
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
  db.exec(generateDBSQL(initDB));

  //populate tables
  insertIntoDB(initInsert);
}

//==============================================================================
//SQL Generation

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

function addField(table, field){
  table.fields.push(field);
}

//wrap string values in single quotes, not necessary when utilizing prepared statements for value injection
function wrap(value){
  if ((typeof value) === "string"){
    return `'${value}'`;
  }
  return value;
}

//////////////////////////////////////

function generateDBSQL(dbObj){
  return dbObj.map(generateTableSQL).join("\n\n");
}

function generateTableSQL(tableObj){
  let pri = generatePrimary(tableObj);
  let fi = tableObj.fields.map(generateFieldSQL);
  let fo = tableObj.fields.map(generateForeignSQL).filter(str => str !== "");
  let lines = fi.concat(fo);
  lines.unshift(pri);
  return `CREATE TABLE '${tableObj.name}' (\n${lines.join(",\n")}\n);`;
}

function generatePrimary(tableObj){
  return `  '${tableObj.name}ID' INTEGER NOT NULL PRIMARY KEY ${tableObj.autoinc ? "AUTOINCREMENT " : ""}UNIQUE`;
}

function generateFieldSQL(fieldObj){
  let words = [];
  words.push(`  '${fieldObj.name}'`);
  words.push(getSqliteType(fieldObj.type));
  if (!fieldObj.nullable){ words.push("NOT NULL") };
  if (fieldObj.default){ words.push(`DEFAULT ${wrap(fieldObj.default)}`) };
  if (fieldObj.check){ words.push(`CHECK (${fieldObj.check})`) };
  if (fieldObj.unique){ words.push("UNIQUE") };
  return words.join(" ");
}

function generateForeignSQL(fieldObj){
  return fieldObj.foreign ? `  FOREIGN KEY ('${fieldObj.name}') REFERENCES '${fieldObj.foreign}'(${fieldObj.foreign}ID)` : "";
}

//==============================================================================
//SQL

const permissionTable = makeTable("Permission", false);
addField(permissionTable, makeField("Name", sqliteType.TEXT, false, false, null, null, null));

const bodTable = makeTable("Bod", true);
addField(bodTable, makeField("PermissionID", sqliteType.INTEGER, false, false, null, null, "Permission"));
addField(bodTable, makeField("FirstName", sqliteType.TEXT, false, false, null, null, null));
addField(bodTable, makeField("LastName", sqliteType.TEXT, false, false, null, null, null));
addField(bodTable, makeField("ContactNum", sqliteType.TEXT, false, false, null, null, null));
addField(bodTable, makeField("Email", sqliteType.TEXT, false, false, null, null, null));
addField(bodTable, makeField("Address", sqliteType.TEXT, true, false, null, null, null));

const itemTable = makeTable("Item", true);
addField(itemTable, makeField("OwnerID", sqliteType.INTEGER, false, false, null, null, "Bod"));
addField(itemTable, makeField("Name", sqliteType.TEXT, false, false, null, null, null));
addField(itemTable, makeField("Desc", sqliteType.TEXT, false, false, null, null, null));

const auctionTable = makeTable("Auction", true);
addField(auctionTable, makeField("Address", sqliteType.TEXT, false, false, null, null, null));
addField(auctionTable, makeField("Start", sqliteType.TEXT, false, false, null, null, null));
addField(auctionTable, makeField("End", sqliteType.TEXT, false, false, null, null, null));

const auctionitemTable = makeTable("AuctionItem", true);
addField(auctionitemTable, makeField("AuctionID", sqliteType.INTEGER, false, false, null, null, "Auction"));
addField(auctionitemTable, makeField("ItemID", sqliteType.INTEGER, false, false, null, null, "Item"));
addField(auctionitemTable, makeField("TransactionID", sqliteType.INTEGER, false, false, null, null, "Transaction"));
addField(auctionitemTable, makeField("AskingPrice", sqliteType.INTEGER, false, false, null, null, null));
addField(auctionitemTable, makeField("ReservePrice", sqliteType.INTEGER, true, false, null, null, null));
addField(auctionitemTable, makeField("PresaleBidPrice", sqliteType.INTEGER, true, false, null, null, null));

const transactionTable = makeTable("Transaction", true);
addField(transactionTable, makeField("BuyerID", sqliteType.INTEGER, false, false, null, null, "Bod"));
addField(transactionTable, makeField("SellerID", sqliteType.INTEGER, false, false, null, null, "Bod"));
addField(transactionTable, makeField("ItemID", sqliteType.INTEGER, false, false, null, null, "Item"));
addField(transactionTable, makeField("Price", sqliteType.INTEGER, false, false, null, null, null));
addField(transactionTable, makeField("Happened", sqliteType.TEXT, false, false, null, null, null));
addField(transactionTable, makeField("BeenPaid", sqliteType.INTEGER, false, false, null, null, null));

const initDB = [permissionTable, bodTable, itemTable, auctionTable, auctionitemTable, transactionTable];

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

/*
So we've got a bunch of types so far:
Boolean (Integer)
Integer
Text
Date (Text)
Money (Integer)
*/
