'use strict';

//==============================================================================
//Dependencies and Globals

const fs = require('fs');
const Database = require('better-sqlite3');

//==============================================================================
//Class Definition

class NewworldDB {

  //====================================
  //Constructor

  //declares sqlite-better variable
  constructor(){
    let db;
  }

  //====================================
  //DB Creation, Connection and Deletion

  //opens database, or creates new one if file is not present
  openDatabase(fileName){
    try{
      this.db = new Database(`database/${fileName}.db`);
    }
    catch (err){
      console.log(err);
    }
  }

  //attempts to close current database connection
  closeDatabase(){
    try{
      this.db.close();
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
        words.push(this.getSQLiteType(fieldObj.type));
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

  //====================================
  //Helper functions

  //get name of SQLite type
  getSQLiteType(num){
    switch(num){
      case 1:
        return "INTEGER"
        break;
      case 2:
        return "TEXT"
        break;
      case 3:
        return "BLOB"
        break;
      case 4:
        return "REAL"
        break;
      case 5:
        return "NUMERIC"
        break;
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
}

//==============================================================================
//Module

module.exports = NewworldDB;
