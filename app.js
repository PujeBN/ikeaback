const express = require("express");
var cors = require('cors')
const app = express();
const fileupload = require('express-fileupload');
var fs = require('fs');
var morgan = require('morgan');
var path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
// setup the logger
app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.json());
app.use(fileupload());
app.use(cors({exposedHeaders:"*"}));
app.use(express.urlencoded({ extended: true }));

app.use(session({ secret: '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', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Серверийн маршрут
// app.get('/google-login',
// );

// app.get('/google-login/callback',

// );
//Bring in the routes
app.use("/api/product", require("./routes/product"));
app.use("/api/home", require("./routes/home"));
app.use("/api/user", require("./routes/user"));
app.use("/api/purchase", require("./routes/purchase"));
app.use("/api/admin", require("./routes/admin"));
app.use(express.static('public'))

//Setup Error Handlers
const errorHandlers = require("./handlers/errorHandler");
app.use(errorHandlers.notFound);
app.use(errorHandlers.mongoseErrors);
if (process.env.ENV === "DEVELOPMENT") {
  app.use(errorHandlers.developmentErrors);
} else {
  app.use(errorHandlers.productionErrors);
}
module.exports = app;