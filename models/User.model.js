var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var UserSchema = new Schema({
  discordId: String,
  currentXP: {
    type: Number,
    default: 0
  },
  totalXP: {
    type: Number,
    default: 0
  },
  priorTenure: {
    type: Number,
    default: 0
  },
  posts: {
    type: Number,
    default: 0
  },
  excludeXP: {
    type: Boolean,
    default: true
  },
  roles: [String]
});

module.exports = mongoose.model("User", UserSchema);
