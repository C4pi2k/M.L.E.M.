// 1 - set up express & mongoose
var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');
var app = express();
var bodyParser = require('body-parser');
var MongoStore = require('connect-mongo');
var mongoose = require('mongoose');
var cookie = express();

var fs = require('fs');
var path = require('path');
require('dotenv/config');

app.use(express.static(__dirname));

/*
function bar(() => {
	console.log('hello')
})

bar(aFunc)
*/

// 1.5 - Creating Session Stuff
app.use(cookieParser());

const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
	secret: bcrypt.genSaltSync(10),
	resave: false,
	saveUninitialized: true,
	cookie: { MaxAge: oneDay },
	store: MongoStore.create({mongoUrl: 'mongodb+srv://mongodbUser:mongodbUser@cluster0.yfuml.mongodb.net/?retryWrites=true&w=majority'})
}));

// 2 - Verbindung zur Datenbank
mongoose.connect(process.env.MONGO_URL,
	{ useNewUrlParser: true, useUnifiedTopology: true }, err => {
		console.log('connected to ' + process.env.MONGO_URL)
	});

// 3 - Code in ./models.js

// 4 - Set up EJS
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// EJS als templating engine setzen
app.set("view engine", "ejs");

// 5 - Set up multer um upload files zu speichern
var multer = require('multer');


var storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'uploads')
	},
	filename: (req, file, cb) => {
		cb(null, file.fieldname + '-' + Date.now())
	}
});

var upload = multer({ storage: storage });

// 6 - Mongoose Models
//var imgModel = require('./model/models');
var userModel = require('./model/users');
const { PRIORITY_ABOVE_NORMAL } = require('constants');
const { json } = require('body-parser');

// 7 - GET Methods
app.get('/', (req, res) => {
	req.
	res.render('welcome');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

// 8 - POST Methods
app.post('/register', upload.single('user'), (req, res) => {

    var today = new Date();

    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

	var userObj = {
        email: req.body.email,
		username: req.body.username,
		password: req.body.password,
        joindate: date,
        profileImg:
        {
            data: null,
            contentType: date
        }
	}
	userModel.create(userObj, (err) => {
		if (err) {
			console.log(err);
		}
		else {
			res.redirect('/');
		}
	});
});

app.post('/login', async (req, res) => {

	let user = await userModel.findOne({ username: req.body.username, password:req.body.password});
	if (user){
				req.session.user = user;
				req.session.userid = user.id;
				req.session.username = req.body.username;
				req.session.password = req.body.password;
				console.log(user);
				res.render('profile', {user: user});
	} else {
		res.status(200).send("User does not exist")
	}
});

// Schritt 9 - Den Server port setzen
var port = process.env.PORT || '3000'
app.listen(port, err => {
	if (err)
		throw err
	console.log('Server listening on port', port)
})
