var	mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var ImageSchema = new Schema({
	serverId: String,
	command: String,
	response: String,
	attachment: String
});

module.exports = mongoose.model("Image", ImageSchema);
