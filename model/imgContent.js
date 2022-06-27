// 3 - Das mongoose Modul laden
var mongoose = require('mongoose');

var imageContentSchema = new mongoose.Schema({
    userID: String,
    description: String,
    img:
    {
		  data: Buffer,
		  contentType: String
	}
});

// Image ist das model mit dem schema imageSchema
module.exports = new mongoose.model('ImageContent', imageContentSchema);
