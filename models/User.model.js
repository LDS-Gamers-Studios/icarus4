var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var UserSchema = new Schema({
	discordId: String,
	currentXP: {
		Type: Number,
		default: 0
	},
	totalXP: {
		Type: Number,
		default: 0
	},
	posts: {
		Type: Number,
		default: 0
	},
	stars: {
		Type: Number,
		default: 0
	},
	preferences: {
		Type: Number,
		default: 0
	},
	ghostBucks: {
		type: Number,
		default: 0
	},
	house: {
		type: String,
		default: null
	},
	roles: [String]
});

module.exports = mongoose.model("User", UserSchema);
