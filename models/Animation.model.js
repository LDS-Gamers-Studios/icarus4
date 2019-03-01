var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var AnimationSchema = new Schema({
  animationId: String,
  channelId: String,
  date: {
    type: Date,
    default: Date.now
  },
  frames: Array
});

module.exports = mongoose.model("Animation", AnimationSchema);
