const jwt = require("jwt-then");
const mysql = require("mysql");

const { db } = require("../db");


// const db = mysql.createConnection({
//     host: 'localhost',
//     database: 'ikea',
//     user: 'ikea',
//     port: 3306,
//     password: 'diLFCwKRX3WFX7ss'
//   });

module.exports = async (req, res, next) => {
  try {
    if (!req.headers.authorization) throw "Forbidden!!";
    const token = req.headers.authorization.split(" ")[1];
    const payload = await jwt.verify(token, 'HS256');
    req.payload = payload;
    let dt = new Date().toISOString();
    let qry = `SELECT id from users WHERE id = ${payload.id} AND permission = 1 OR permission=3 OR permission=4`;
    db.query(qry, async (err, result) => {
      if(err) {
        throw err;
      }
      if(result.length > 0) {
        req.user = result[0]
        next();
      } else {
        return res.status(402).json({
          message: "Access denied"
        });
      }
    });
  } catch (err) {
    res.status(401).json({
      message: "Forbidden",
    });
  }
};