var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var TagSchema = new Schema({
  serverId: String,
  tag: String,
  response: String,
  attachment: String
});

module.exports = mongoose.model("Tag", TagSchema);
