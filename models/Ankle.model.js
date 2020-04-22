var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var AnkleSchema = new Schema({
  discordId: String,
  channel: String,
  message: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Ankle", AnkleSchema);
