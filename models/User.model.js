var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var UserSchema = new Schema({
	discordId: String,
	currentXP: Number,
	totalXP: Number,
	posts: Number,
	stars: Number,
	preferences: Number,
	ghostBucks: Number,
	house: String,
	excludeXP: {
		type: Boolean,
		default: false
	},
	roles: [String]
});

module.exports = mongoose.model("User", UserSchema);
