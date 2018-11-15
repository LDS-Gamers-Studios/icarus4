var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var BankSchema = new Schema({
	discordId: String,
	timestamp: {
		type: Date,
		default: Date.now
	},
	description: String,
	value: Number,
	currency: String,
	mod: String
});

module.exports = mongoose.model("Bank", BankSchema);
