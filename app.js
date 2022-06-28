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
var userModel = require('./model/users');
var imageModel = require('./model/imgContent');
var textModel = require('./model/textContent');
var followModel = require('./model/following');
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

app.get('/userSearch', (req, res) => {
	res.render('userSearch');
})

app.get('/userSearchInput', (req, res) => {
	res.render('userSearchInput');
})

app.get('/forYouPage', (req, res) => {
	res.render('forYouPage');
})

app.get('/uploadImage', (req, res) => {
	console.log(req.session.userid);
	console.log(req.session.username);
	res.render('uploadImage');
})

app.get('/uploadText', (req, res) => {
	console.log(req.session.userid);
	console.log(req.session.username);
	res.render('uploadText');
})

app.get('/profile', (req, res) => {
	res.render('profile');
})

app.get('/comment', (req, res) => {

	let imageID = req.body.imageID;

	console.log(imageID);

	res.render('comment', {image: imageID});
})

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

app.post('/back', async (req, res) => {
	let user = await userModel.findById(req.session.userid).exec();

	console.log(req.session.userid);

	console.log(user);

	let images = await imageModel.find({userID: req.session.userid}).exec();

	let texts = await textModel.find({userID: req.session.userid}).exec();

	res.render('profile', {user: user, images: images, texts: texts});
})

app.post('/login', async (req, res) => {

	let user = await userModel.findOne({ username: req.body.username, password:req.body.password});

	if (user){
			req.session.userid = user.id;
			req.session.username = user.username;
			console.log(req.session.userid);
			console.log(req.session.username);

			let images = await imageModel.find({userID: req.session.userid}).exec();

			let texts = await textModel.find({userID: req.session.userid}).exec();

			res.render('profile', {user: user, images: images, texts: texts});
	} else {
		res.status(200).send("User does not exist")
	}
	}
);

app.post('/changeProfilePicture', upload.single('image'), async (req, res) => {

	let userId = req.session.userid;

	console.log(req.file);

	let data = fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename));

	let update = {profileImg:{
		data: data,
		contentType: req.file.mimetype
	}}

	await userModel.findOneAndUpdate(userId, update, {});

	let user = await userModel.findOne({ username: req.session.username, password: req.session.password});
	let images = await imageModel.find({userID: req.session.userid}).exec();
	let texts = await textModel.find({userID: req.session.userid}).exec();

	res.render('profile', {user: user, images: images, texts: texts});
})

app.post('/uploadImage', upload.single('image'), async (req, res, next) => {

	var obj = {
		userID: req.session.userid,
		description: req.body.description,
		img: {
			data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
			contentType: req.file.mimetype
		}
	}
	imageModel.create(obj, async (err, item) => {
		if (err) {
			console.log(err);
		}
		else {
			item.save();
			
			let user = await userModel.findById(req.session.userid);
			let images = await imageModel.find({userID: req.session.userid}).exec();
			let texts = await textModel.find({userID: req.session.userid}).exec();

			res.render('profile', {user: user, images:images, texts: texts});
		}
	});
});

app.post('/uploadText', upload.single('image'), async (req, res, next) => {

	var obj = {
		userID: req.session.userid,
		title: req.body.userTitle,
		text: req.body.userText
	}
	textModel.create(obj, async (err, item) => {
		if (err) {
			console.log(err);
		}
		else {
			item.save();

			let user = await userModel.findById(req.session.userid);
			let images = await imageModel.find({userID: req.session.userid}).exec();
			let texts = await textModel.find({userID: req.session.userid}).exec();

			res.render('profile', {user: user, images: images, texts: texts});
		}
	});
});

app.post('/searchForUser', async(req, res, next) => {

	req.session.searchTerm = req.body.userInput;
	let searchTerm = req.body.userInput;

	console.log(typeof req.session.searchTerm);
	console.log(searchTerm);
	console.log(req.body);

	let searchUsers = await userModel.find({username: { $regex:  searchTerm, $options: "i"}});


	res.render('userSearch', {foundUsers: searchUsers});
})

app.post('/followUser', async(req, res, next) => {

	let currentUser = req.session.userid;
	let followingUser = req.body.followingUserID;
	
	var follow = {
		userID: currentUser,
		followingUserID: followingUser
	}
	
	followModel.create(follow, async (err) => {
		if(err) {
			console.log(err);
		}
		else {
			let user = await userModel.findById(req.session.userid);
			let images = await imageModel.find({userID: req.session.userid}).exec();
			let texts = await textModel.find({userID: req.session.userid}).exec();

			res.render('profile', {user: user, images: images, texts: texts});
		}
	})
})

app.post('/forYouPage', async(req, res, next) => {

	let following = await followModel.find({userID: req.session.userid});
	
	let followingArr = Array.from(following);

	let imageContent = [];

	let textContent = [];

	for(let follower of following){
		let images = await imageModel.find({userID: follower.followingUserID});
		let texts = await textModel.find({userID: follower.followingUserID});

		for(let image of images){
			imageContent.push(image);
		}

		for(let text of texts){
			textContent.push(text);
		}
	}

	res.render('forYouPage', {images: imageContent, texts: textContent});
})	

// Schritt 9 - Den Server port setzen
var port = process.env.PORT || '3000'
app.listen(port, err => {
	if (err)
		throw err
	console.log('Server listening on port', port)
})

// reduce

