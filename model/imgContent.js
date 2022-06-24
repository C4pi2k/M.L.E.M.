// 3 - Das mongoose Modul laden
var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    userID: String,
    description: String,
    profileImg:
    {
		  data: Buffer,
		  contentType: String
	}
});

// Image ist das model mit dem schema imageSchema
module.exports = new mongoose.model('ImageContent', imageContentSchema);
