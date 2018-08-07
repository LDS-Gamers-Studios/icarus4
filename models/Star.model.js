var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var StarSchema = new Schema({
	author: String,
	messageId: String,
	channelId: String,
	starId: String,
	deny: Boolean,
	timestamp: Date
});

module.exports = mongoose.model("Star", StarSchema);
