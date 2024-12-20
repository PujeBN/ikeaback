let fs = require('fs');

module.exports = async (req, res, next) =>{
    let writer = fs.createWriteStream('emailLog.txt',{
        flags: 'a'
      });
    writer.write(`\n ${req.method}---${req.originalUrl}---${req._startTime}`);
    writer.end();
    next();
}