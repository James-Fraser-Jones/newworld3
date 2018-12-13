'use strict';

//==============================================================================
//Module

const newworldDB = {
  open: openDB,
  close: closeDB,
  delete: deleteDB,
  create: createDB
}

module.exports = newworldDB

//==============================================================================
//Global variables

const fs = require('fs');
const Database = require('better-sqlite3');

const helperDB = require('./helperDB');

//==============================================================================
//Exposed methods

function openDB(db, dbName){
  db = new Database(`database/${dbName}.db`);
}

function closeDB(db){
  if (db && db.open){
    db.close();
    db = undefined;
  }
}

function deleteDB(db, dbName){
  closeDB(db);
  try{
    fs.unlinkSync(`database/${dbName}.db`);
  }
  catch(err){
    console.log(err);
  }
  try{
    fs.unlinkSync(`database/${dbName}.json`);
  }
  catch(err){
    console.log(err);
  }
}

function createDB(db, dbName, dbObj, insertObj){
  deleteDB(db, dbName);
  openDB(db, dbName);

  let gen = helperDB.generate(db, dbObj);
  if (gen.success){
    fs.writeFile(`database/${dbName}.json`, JSON.stringify(dbObj, null, 2), function(err){
      if (err){
        console.log(err);
      }
      else{
        console.log(helperDB.insert(db, insertObj));
      }
    });
  }
  else{
    console.log(gen.response);
  }
}
