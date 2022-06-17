// 3 - Das mongoose Modul laden
var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    email: String,
    username: String,
    password: String,
    joindate: Date,
    profileImg:
    {
		data: Buffer,
		contentType: String
	}
});

// Image ist das model mit dem schema imageSchema
module.exports = new mongoose.model('User', userSchema);
