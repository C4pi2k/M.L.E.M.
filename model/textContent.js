// 3 - Das mongoose Modul laden
var mongoose = require('mongoose');

var textContentSchema = new mongoose.Schema({
    userID: String,
    title: String,
    text: String
});

// Image ist das model mit dem schema imageSchema
module.exports = new mongoose.model('TextContent', textContentSchema);
