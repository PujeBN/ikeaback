const mysql = require("mysql");

const db = mysql.createConnection({
  host: '202.131.237.186',
  database: 'orgil_test',
  user: 'orgil_Test',
  password: 'HpnSraNaH87GMiNw'
});



exports.db = db;