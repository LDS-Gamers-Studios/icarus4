var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var InfractionSchema = new Schema({
	discordId: String,
	channel: String,
	message: String,
	flag: String,
	timestamp: {
		type: Date,
		default: Date.now
	},
	description: String,
	value: Number,
	mod: String
});

module.exports = mongoose.model("Infraction", InfractionSchema);
