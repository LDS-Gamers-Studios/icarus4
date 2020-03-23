var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var RemindSchema = new Schema({
  discordId: String,
  reminder: String,
  timestamp: Date,
  complete: {
    type: Boolean,
    value: false
  }
});

module.exports = mongoose.model("Remind", RemindSchema);
