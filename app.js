'use strict';

//==============================================================================
//Global references and variables

const fs = require('fs');

const NewworldDB = require('./newworldDB');
const db = new NewworldDB();

const express = require('express');
const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = 4200;

//==============================================================================
//Express static content delivery

app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.use('/node_modules', express.static(__dirname + '/node_modules'));
app.use('/public', express.static(__dirname + '/public'));

//==============================================================================
//SocketIO messaging

// io.on('connection', socket => {
//   console.log('user connected');
//
//   const tableData = db.prepare('SELECT * FROM Bod').all();
//   socket.emit('initialize', tableData);
//
//   socket.on('disconnect', () => {
//     console.log('user disconnected');
//   });
//
//   socket.on('toServer', dbObjs => {
//     try{
//       console.log(dbObjs);
//     }
//     catch (err){
//       console.log(err);
//     }
//   });
// });

//==============================================================================
//Exec

//open database
db.openDatabase("auctionDB");

//listen on port
server.listen(port, () => console.log(`Listening on port ${port}!`));

//==============================================================================
//DB Functions

function callDB(messageObj){
  switch(messageObj){
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
