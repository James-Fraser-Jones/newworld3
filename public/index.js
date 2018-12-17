'use strict';

//==============================================================================
//Global variables

// const container = document.getElementById('example');
// const socket = io('http://localhost:4200');
// var hot;

//==============================================================================
//Socket events

socket.on('connect', (data) => {
  console.log("connected to server");
});

socket.on('disconnect', (data) => {
  console.log("disconnected from server");
});

socket.on('initialize', createTable);

socket.on('toClient', recieveUpdate);

//==============================================================================
//Table creation and updation

//example update:
//recieveUpdate([{tableName:"Customer", pkID:15, fieldName:"FirstName", value:"Freddy"}])

// function createTable(data){
//   hot = new Handsontable(container, {
//     data: data,
//     rowHeaders: true,
//     colHeaders: pure.exampleSchema.map(pure.showColumnHeader),
//     columns: Object.keys(data[0]).map(makeColumn),
//     columnSorting: true,
//     manualColumnResize: true,
//     manualRowMove: true,
//     afterChange: sendUpdate
//   });
// }
//
// function sendUpdate(sheetArrs, source){
//   if ((source !== "newworld") && sheetArrs){
//     let dbObjs = sheetArrs.map(aSheetToDB);
//     console.log("dbObjs = " + JSON.stringify(dbObjs));
//     socket.emit('toServer', dbObjs);
//   }
// }
//
// function recieveUpdate(dbObjs){
//   if (dbObjs){
//     let sheetObjs = dbObjs.map(oDBToSheet);
//     console.log("sheetObjs = " + JSON.stringify(sheetObjs));
//     sheetObjs.forEach(applyUpdate);
//   }
// }
//
// function applyUpdate(sheetObj){
//   if (sheetObj){
//     hot.setDataAtRowProp(sheetObj.rowNum, sheetObj.colName, sheetObj.value, "newworld");
//   }
// }

//==============================================================================
//Reference mappings

// function oDBToSheet(dbObj){
//   return dBToSheet(dbObj.tableName, dbObj.pkID, dbObj.fieldName, dbObj.value);
// }
//
// function oSheetToDB(sheetObj){
//   return sheetToDB(sheetObj.rowNum, sheetObj.colName, sheetObj.value);
// }
//
// function aSheetToDB(sheetArr){
//   return sheetToDB(sheetArr[0], sheetArr[1], sheetArr[3]);
// }
//
// function sheetToDB(rowNum, colName, value){ //mapping cell from sheet refs to database refs
//   let test = colName.split("_");
//
//   let tableName = test[0];
//   let fieldName = test[test.length - 1];
//   let pkID = hot.getDataAtRowProp(rowNum, tableName + "ID");
//
//   return {tableName: tableName, pkID: pkID, fieldName: fieldName, value: value};
// }
//
// function dBToSheet(tableName, pkID, fieldName, value){ //mapping cell from database refs to sheet refs
//   let colName = tableName + "_" + fieldName;
//   let rowNum = hot.getDataAtProp(tableName + "ID").findIndex((element) => element === pkID);
//
//   if (rowNum >= 0){
//     return {colName: colName, rowNum: rowNum, value: value};
//   }
//   else {
//     return null;
//   }
// }

//==============================================================================
//Helper functions

// function makeColumn(key){
//   let column;
//   if (keyIsPK(key)){
//     column = {data: key, editor: 'numeric', readOnly: true};
//   }
//   else {
//     column = {data: key, editor: 'text'};
//   }
//   return column;
// }
//
// function makeColumnHeader(key){
//   let test = key.split("_");
//   let columnHeader = test[test.length - 1];
//   if (!keyIsPK(key)){
//     columnHeader = columnHeader.replace(/([A-Z])/g, ' $1').trim(); //add spaces before capital letters
//   }
//   return columnHeader;
// }
//
// function keyIsPK(key){
//   return ((key.length > 2) && (key.slice(-2).toLowerCase() === "id"));
// }
