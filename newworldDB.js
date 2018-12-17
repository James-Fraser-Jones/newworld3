'use strict';

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

//==============================================================================
//Dependencies and Globals

const fs = require('fs');
const Database = require('better-sqlite3');

//==============================================================================
//Class Definition

class NewworldDB {

  //====================================
  //DB Connection, Creation and Deletion

  //opens database, or creates new one if file is not present
  openDatabase(dbName){
    try{
      this.db = new Database(`database/${dbName}.db`);
      this.tables = JSON.parse(fs.readFileSync(`public/${dbName}Tables.json`, 'utf8'));
    }
    catch (err){
      console.log(err);
    }
  }

  //attempts to close current database connection
  closeDatabase(){
    try{
      if (this.db && this.db.open){
        this.db.close();
        delete this.db;
        delete this.tables;
      }
    }
    catch (err){
      console.log(err);
    }
  }

  //attempts to create database, based on DB name (this depends on existence "Tables" and "Inserts" files of the same name)
  createDatabase(dbName){
    try{
      this.openDatabase(dbName);

      this.tables.forEach(this.createTable, this);

      let inserts = JSON.parse(fs.readFileSync(`public/${dbName}Inserts.json`, 'utf8'));
      inserts.forEach(this.insertRecord, this);
    }
    catch (err){
      console.log(err);
    }
  }

  //will attempt to close and subsequently delete the previously opened database file
  deleteDatabase(){
    try{
      let name = this.db.name;
      this.closeDatabase();
      fs.unlinkSync(name);
    }
    catch(err){
      console.log(err);
    }
  }

  //====================================
  //DB Manipulation

  //creates database table specified by tableObj, otherwise prints error message to console
  createTable(tableObj){
    try{
      //getting all SQL
      let sqlPK = `  '${tableObj.name}ID' INTEGER NOT NULL PRIMARY KEY ${tableObj.autoinc ? "AUTOINCREMENT " : ""}UNIQUE`;

      let sqlFields = tableObj.fields.map(fieldObj => {
        let words = [];
        words.push(`  '${fieldObj.name}'`);
        words.push(this.getSQLiteTypeName(fieldObj.type));
        if (!fieldObj.nullable){ words.push("NOT NULL") };
        if (fieldObj.default){ words.push(`DEFAULT ${this.wrapString(fieldObj.default)}`) };
        if (fieldObj.check){ words.push(`CHECK (${fieldObj.check})`) };
        if (fieldObj.unique){ words.push("UNIQUE") };
        return words.join(" ");
      });

      let sqlForeigns = tableObj.fields.map(fieldObj => {
        return fieldObj.foreign ? `  FOREIGN KEY ('${fieldObj.name}') REFERENCES '${fieldObj.foreign}'(${fieldObj.foreign}ID)` : "";
      }).filter(str => str !== "");

      //joining SQL together
      let lines = sqlFields.concat(sqlForeigns);
      lines.unshift(sqlPK);

      //getting final SQL string
      let sql = `CREATE TABLE '${tableObj.name}' (\n${lines.join(",\n")}\n);`;

      //executing sql string
      this.db.exec(sql);
    }
    catch (err){
      console.log(err);
    }
  }

  //adds {success:true, response:lastInsertedID} or {success:false, response:errorMessage} as result to insertObj
  insertRecord(insertObj){
    try{
      //null protection
      for (let i = 0; i < insertObj.values.length; i++){
        if (insertObj.values[i] === null){
          let table = this.searchForName(this.tables, insertObj.tableName);
          let field = this.searchForName(table.fields, insertObj.fieldNames[i]);
          if (!field.nullable){
            insertObj.values[i] = this.getSQLiteTypeDefaultValue(field.type);
          }
        }
      }

      //begin insert process
      let sql = `INSERT INTO ${insertObj.tableName}(${insertObj.fieldNames.join(",")}) VALUES (${insertObj.values.map(() => "?").join(",")})`
      let preparedInsert = this.db.prepare(sql);
      let lastInsertedID = preparedInsert.run(insertObj.values).lastInsertRowid;
      insertObj.result = {success: true, response: lastInsertedID};
    }
    catch (err){
      insertObj.result = {success: false, response: err};
    }
  }

  //adds {success:true, response:newValue} or {success:false, response:errorMessage} as result to updateObj
  updateCell(updateObj){
    try{
      //null protection
      if (updateObj.value === null){
        let table = this.searchForName(this.tables, updateObj.tableName);
        let field = this.searchForName(table.fields, updateObj.fieldName);
        if (!field.nullable){
          updateObj.value = this.getSQLiteTypeDefaultValue(field.type);
        }
      }

      //update
      let sql = `UPDATE ${updateObj.tableName} SET ${updateObj.fieldName} = ? WHERE ${updateObj.tableName}ID = ?`
      let preparedUpdate = this.db.prepare(sql);
      preparedUpdate.run(updateObj.value, updateObj.pkID);
      //query
      sql = `SELECT ${updateObj.fieldName} FROM ${updateObj.tableName} WHERE ${updateObj.tableName}ID = ?`
      let preparedQuery = this.db.prepare(sql);
      let newValue = preparedQuery.get(updateObj.pkID)[updateObj.fieldName];
      //return success
      updateObj.result = {success: true, response: newValue};
    }
    catch (err){
      updateObj.result = {success: false, response: err};
    }
  }

  //adds {success:true} or {success:false, response:errorMessage} as result to deleteObj
  deleteRecord(deleteObj){
    try{
      let sql = `DELETE FROM ${deleteObj.tableName} WHERE ${deleteObj.tableName}ID = ?`;
      let preparedDelete = this.db.prepare(sql);
      let numberOfChangedRows = preparedDelete.run(deleteObj.pkID).changes;
      if (numberOfChangedRows === 1){
        deleteObj.result = {success: true};
      }
      else{
        deleteObj.result = {success: false, response: `Error: numberOfChangedRows = ${numberOfChangedRows}`}
      }
    }
    catch (err){
      deleteObj.result = {success: false, response: err};
    }
  }

  //adds {success:true, response:dataTable} or {success:false, response:errorMessage} as result to queryObj
  queryTable(queryObj){
    try{
      let sql = `SELECT * FROM ${queryObj.tableName}`;
      let dt = this.db.exec(sql);
      queryObj.result = {success: true, response: dt};
    }
    catch(err){
      queryObj.result = {success: false, response: err};
    }
  }

  //====================================
  //Helper functions

  //get name of SQLite type
  getSQLiteTypeName(num){
    switch(num){
      case 1:
        return "TEXT"
        break;
      case 2:
        return "INTEGER"
        break;
      case 3:
        return "REAL"
        break;
      // case 4:
      //   return "NUMERIC"
      //   break;
      // case 5:
      //   return "BLOB"
      //   break;
      default:
        return null;
    }
  }

  //get default value for SQLite type to replace null values with, where necessary
  getSQLiteTypeDefaultValue(num){
    switch(num){
      case 1:
        return ""
        break;
      case 2:
        return 0
        break;
      case 3:
        return 0.0
        break;
      // case 4:
      //   return 0
      //   break;
      // case 5:
      //   return 0
      //   break;
      default:
        return null;
    }
  }

  //wrap string values in single quotes, not necessary when utilizing prepared statements for value injection
  wrapString(value){
    if ((typeof value) === "string"){
      return `'${value}'`;
    }
    return value;
  }

  //search array of arbitrary objects for one with matching "name" property
  searchForName(objs, name){
    for (let i = 0; i < objs.length; i++){
      if (objs[i].name === name){
        return objs[i];
      }
    }
    return null;
  }
}

//==============================================================================
//Module

module.exports = NewworldDB;
