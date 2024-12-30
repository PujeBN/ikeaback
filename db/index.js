const mysql = require("mysql");

const db = mysql.createConnection({
  host: 'localhost',
  database: 'ikea',
  user: 'root',
  password: ''
});


// const db = mysql.createConnection({
//   host: 'localhost',
//   database: 'ikea',
//   user: 'ikea',
//   port: 3306,
//   password: 'diLFCwKRX3WFX7ss'
// });



exports.db = db;