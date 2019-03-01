var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var SpoilerSchema = new Schema({
  spoilerId: String,
  authorName: String,
  authorId: String,
  channelId: String,
  channelName: String,
  content: String,
  topic: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Spoiler", SpoilerSchema);
