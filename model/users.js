// Schritt 3 - Das mongoose Modul laden
var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
	name: String
});

// Image ist das model mit dem schema imageSchema
module.exports = new mongoose.model('User', userSchema);
