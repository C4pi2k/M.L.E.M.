// 1 - set up express & mongoose
var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bcrypt = require('bcrypt');
var bodyParser = require('body-parser');
var MongoStore = require('connect-mongo');
var mongoose = require('mongoose');
var speakeasy = require('speakeasy');
var QRCode = require('qrcode');
var cookie = express();
var app = express();

var fs = require('fs');
var path = require('path');
require('dotenv/config');

//totp stuff
var secret = "";

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
var commentModel = require('./model/commentary');
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

app.get('/totp', (req, res) => {
	res.render('totp');
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
		totpDone: false,
		secret: '',
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

	let images = await imageModel.find({userID: req.session.userid}).exec();

	let texts = await textModel.find({userID: req.session.userid}).exec();

	res.render('profile', {user: user, images: images, texts: texts});
})
var globalUser;
var globalImages;
var globalTexts;
var globalBase32Secret;
var gloablUserId;

app.post('/login', async (req, res) => {

	let user = await userModel.findOne({ username: req.body.username, password:req.body.password});

	if (user){
			req.session.userid = user.id;
			req.session.username = user.username;
			let images = await imageModel.find({userID: req.session.userid}).exec();

			let texts = await textModel.find({userID: req.session.userid}).exec();

			if(user.totpDone == false){
				globalUser = user;
				globalImages = images;
				globalTexts = texts;
				secret = speakeasy.generateSecret({length: 30 });
				globalBase32Secret = secret.base32;

				QRCode.toDataURL(secret.otpauth_url, async function(err, data_url){
					globalUserId = user.id;
					// console.log('1');
					// console.log(globalUserId);
					res.render('totp', {qr_code: data_url, userId: user.id});
				});
			} else {
				res.render('profile', {user: user, images: images, texts: texts});
			}

	} else {
		res.status(200).send("User does not exist");
	}
	}
);

app.post('/totp', async (req, res) => {

	var base32Secret = globalBase32Secret;
	console.log('2');
	console.log(base32Secret);

	var userToken = req.body.userToken;
	console.log('3');
	console.log(req.body.userToken);

	var userId = req.body.userId;
	console.log('4');
	console.log(globalUserId);
	
	var verified = speakeasy.totp.verify({ secret: base32Secret, encoding: 'base32', token: userToken});
	console.log('5');
	console.log(verified);

	if(verified == true)
	{
		let update = {
			totpDone: true,
		}


		let tempUser = await userModel.findOneAndUpdate(globalUser.id, update, {
			new: true
		});

		res.render('profile', {user: globalUser, images: globalImages, texts: globalTexts});
	}
})

app.post('/changeProfilePicture', upload.single('image'), async (req, res) => {

	let userId = req.session.userid;

	console.log(req.file);

	let data = fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename));

	let update = {profileImg:{
		data: data,
		contentType: req.file.mimetype
	}}

	let user = await userModel.findOneAndUpdate(userId, update, {
		new: true
	});

	//let user = await userModel.findOne({ username: req.session.username, password: req.session.password});
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
});

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
	});
});

app.post('/forYouPage', async(req, res, next) => {

	let following = await followModel.find({userID: req.session.userid});

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
});

app.post('/comment', async (req, res) => {

	let contentIdent = req.body.contentIdent;

	let userComments = await commentModel.find({contentID: contentIdent});

	res.render('comment', {comments: userComments, contentIdent: contentIdent});
})

app.post('/uploadComment', async (req, res, next) => {

	var comment = {
		contentID: req.body.contentIdent,
		comment: req.body.userComment
	}

	
	commentModel.create(comment, async (err) => {
		if(err){
			console.log(err);
		}
		else {
			let contentIdent = req.body.contentIdent;
		
			let userComments = await commentModel.find({contentID: contentIdent});
			
			res.render('comment', {comments: userComments, contentIdent:req.body.contentIdent});
		}
	})
})

// Schritt 9 - Den Server port setzen
var port = process.env.PORT || '3000'
app.listen(port, err => {
	if (err)
		throw err
	console.log('Server listening on port', port)
})

// reduce

