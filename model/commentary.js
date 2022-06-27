// 3 - Das mongoose Modul laden
var mongoose = require('mongoose');

var commentSchema = new mongoose.Schema({
    imageID: String,
    comment: String
});

// Image ist das model mit dem schema imageSchema
module.exports = new mongoose.model('Comment', commentSchema);
