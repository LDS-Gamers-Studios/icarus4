var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var MissionarySchema = new Schema({
	discordId: String,
	email: String,
	returns: String,
	mission: String
});

module.exports = mongoose.model("Missionary", MissionarySchema);
