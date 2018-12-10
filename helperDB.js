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
    return "Generation Success!";
  }
  catch (err){
    return err;
  }
}

//TODO: BOTH INSERT AND DELETE FUNCTIONS NEED TO DO THE SAME THING AS UPDATE AND RETURN AN OBJECT THAT CAN BE INSPECTED
//IT'S NOT USEFUL TO HAVE TABLE/FIELD/ROW/etc.. INFO GET LOST WHEN RETRIEVING SUCESS/ERROR MESSAGES

//returns array of inserted pkIDs, and possible errors
function insertIntoDB(db, inserts){
  return inserts.map(insertRowObj(db));
}

//returns same update structure as is passed in, with values taken by querying database after update to ensure consistency
function updateDB(db, updates){
  let newupdates = JSON.parse(JSON.stringify(updates)); //make new copy of update structure (might be inefficient)
  newupdates.map(update => {update.value = updateCellObj(db)(update);});
  return newupdates;
}

//returns array of 0/1s (indicating whether each record was found), and possible errors
function deleteFromDB(db, dels){
  return dels.map(deleteRowObj(db));
}

//==============================================================================
//DB Manipulation

function insertRowObj(db){
  return (insert => {
    return insertRow(db, insert.tableName, insert.fieldNames, insert.values);
  });
}

function updateCellObj(db){
  return (update => {
    return updateCell(db, update.tableName, update.fieldName, update.pkID, update.value);
  });
}

function deleteRowObj(db){
  return (del => {
    return deleteRow(db, del.tableName, del.pkID);
  });
}

//returns pkID of newly inserted row, or an error
function insertRow(db, tableName, fieldNames, values){
  //attempt insert, or return error
  try{
    let preparedInsert = db.prepare(`INSERT INTO ${tableName}(${fieldNames.join(",")}) VALUES (${values.map(() => "?").join(",")})`);
    return preparedInsert.run(values).lastInsertRowid;
  }
  catch (err){
    return err;
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

//returns number of rows affected by the delete (i.e 1 or 0 if pkID isn't present), or an error
function deleteRow(db, tableName, pkID){
  //attempt delete, or return error
  try{
    let preparedDelete = db.prepare(`DELETE FROM ${tableName} WHERE ${tableName}ID = ?`);
    return preparedDelete.run(pkID).changes;
  }
  catch (err){
    return err;
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
