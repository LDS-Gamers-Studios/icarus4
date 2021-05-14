var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var WebhookIdSchema = new Schema({
  channelId: {
    type: String,
    required: true
  },
  tag: String,
  username: {
    type: String,
    required: true
  },
  avatarURL: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("WebhookId", WebhookIdSchema);
