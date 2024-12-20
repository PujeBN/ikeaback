const fs=require('fs');
const path = require('path');
const mysql = require('mysql');
let timer = null;

const { db } = require("./db");

// const db = mysql.createConnection({
//     host: 'localhost',
//     database: 'ikea',
//     user: 'ikea',
//     port: 3306,
//     password: 'diLFCwKRX3WFX7ss'
//   });

var timerStart = function() {
  clearInterval(timer);
  timer = setInterval(updateTimer, 3600000);
  //43200000
}

var updateTimer =  function () {
  console.log('hello');
  let check = `UPDATE orders SET status = 'expired' WHERE end_at < NOW() AND status = 'pending'`;
  db.query(check, err => {
    if(err) {
      throw err;
    }
  });
}

db.connect(err => {
  if(err) {
    console.log(err);
    throw err
  }
  console.log('My sql connected');``
});

const app = require('./app');
const port = 8001;
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    timerStart();
});


const io = require("socket.io")(server);
const jwt = require("jwt-then");


io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query.token;
    const payload = await jwt.verify(token, 'HS256');
    socket.userId = payload.id;
    next();
  } catch (err) {}
});


io.on("connection", (socket) => {

  console.log("Connected: " + socket.userId);

  socket.on("disconnect", () => {
    console.log("Disconnected: " + socket.userId);
  });

});