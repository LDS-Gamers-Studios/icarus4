var mongoose = require('mongoose'),
  {nanoid} = require("nanoid"),
  Schema = mongoose.Schema;

var BadgeSchema = new Schema({
  _id: {
    type: String,
    default: nanoid
  },
  title: String,
  image: String,
  overrides: [String],
  cardDisplay: {
    type: Boolean,
    default: false
  },
  description: String,
  colors: String
});

module.exports = mongoose.model("Badge", BadgeSchema);
