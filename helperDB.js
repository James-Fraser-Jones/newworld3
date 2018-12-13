'use strict';

//==============================================================================
//Module

const helperDB = {
  create: createDB,
  addTable: addTable,
  addField: addField,
  generate: generateDB,
  insert: insertIntoDB,
  update: updateDB,
  delete: deleteFromDB,
  type: { //helperDB's sqltype enum
    INTEGER : 1,
    TEXT : 2,
    BLOB : 3,
    REAL : 4,
    NUMERIC : 5
  }
}

module.exports = helperDB

//==============================================================================
//Exposed methods

//creates database object
//createDB :: String -> JSON
function createDB(name){
  return {
    name: name, //String
    tables: []
  };
}

//adds a table to an existing database object and returns a reference to it
function addTable(dbObj, name, autoinc){
  let newtable = makeTable(name, autoinc);
  dbObj.tables.push(newtable);
  return newtable;
}

//adds a field to a table object
function addField(table, name, type, nullable, unique, def, check, foreign){
  table.fields.push(makeField(name, type, nullable, unique, def, check, foreign));
}

//adds tables to database, as specified in database object, returns success or error message
function generateDB(db, dbObj){
  try {
    let sql = generateDBSQL(dbObj);
    db.exec(sql);
    return {success: true, response: 1};
  }
  catch (err){
    return {success: false, response: err};
  }
}

//returns copy of inserts object with additional field "result", this contains success bool and either an error or pkID of inserted row
function insertIntoDB(db, inserts){
  let newinserts = JSON.parse(JSON.stringify(inserts)); //make new copy of update structure (might be inefficient)
  newinserts.map(insert => {insert.result = insertRowObj(db, insert);});
  return newinserts;
}

//returns copy of updates object with additional field "result", this contains success bool and either an error or recently queried value
function updateDB(db, updates){
  let newupdates = JSON.parse(JSON.stringify(updates)); //make new copy of update structure (might be inefficient)
  newupdates.map(update => {update.result = updateCellObj(db, update);});
  return newupdates;
}

//returns copy of dels object with additional field "result", this contains success bool and either an error or number of affected rows
function deleteFromDB(db, dels){
  let newdels = JSON.parse(JSON.stringify(dels)); //make new copy of update structure (might be inefficient)
  newdels.map(del => {del.result = deleteRowObj(db, del);});
  return newdels;
}

//==============================================================================
//DB Manipulation

function insertRowObj(db, insert){
  return insertRow(db, insert.tableName, insert.fieldNames, insert.values);
}

function updateCellObj(db, update){
  return updateCell(db, update.tableName, update.fieldName, update.pkID, update.value);
}

function deleteRowObj(db, del){
  return deleteRow(db, del.tableName, del.pkID);
}

//returns pkID of newly inserted row, or an error
function insertRow(db, tableName, fieldNames, values){
  //attempt insert, or return error
  try{
    let preparedInsert = db.prepare(`INSERT INTO ${tableName}(${fieldNames.join(",")}) VALUES (${values.map(() => "?").join(",")})`);
    let lastInsertedID = preparedInsert.run(values).lastInsertRowid;
    return {success: true, response: lastInsertedID};
  }
  catch (err){
    return {success: false, response: err};
  }
}

//returns value of updated field after applying the update, or an error
function updateCell(db, tableName, fieldName, pkID, value){
  //attempt update, or return error
  try{
    let preparedUpdate = db.prepare(`UPDATE ${tableName} SET ${fieldName} = ? WHERE ${tableName}ID = ?`);
    preparedUpdate.run(value, pkID);
  }
  catch (err){
    return {success: false, response: err};
  }
  //attempt query, or return error
  try{
    let preparedQuery = db.prepare(`SELECT ${fieldName} FROM ${tableName} WHERE ${tableName}ID = ?`);
    let newValue = preparedQuery.get(pkID)[fieldName];
    return {success: true, response: newValue}
  }
  catch (err){
    return {success: false, response: err};
  }
}

//returns number of rows affected by the delete (i.e 1 or 0 if pkID isn't present), or an error
function deleteRow(db, tableName, pkID){
  //attempt delete, or return error
  try{
    let preparedDelete = db.prepare(`DELETE FROM ${tableName} WHERE ${tableName}ID = ?`);
    let numberOfChangedRows = preparedDelete.run(pkID).changes;
    return {success: true, response: numberOfChangedRows};
  }
  catch (err){
    return {success: false, response: err};
  }
}

//==============================================================================
//SQL JSON Representation

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

//==============================================================================
//SQL Generation

function generateDBSQL(dbObj){
  return dbObj.tables.map(generateTableSQL).join("\n\n");
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

//==============================================================================
//Helper functions

//get key from helperDB's sqltype enum
function getSqliteType(num){
  let values = Object.values(helperDB.type);
  let i;
  for (i = 0; i < values.length; i++){
    if (num === values[i]){
      return Object.keys(helperDB.type)[i];
    }
  }
  return null;
}

//wrap string values in single quotes, not necessary when utilizing prepared statements for value injection
function wrap(value){
  if ((typeof value) === "string"){
    return `'${value}'`;
  }
  return value;
}
