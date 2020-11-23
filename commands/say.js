const Augur = require("augurbot");
const chars = require("../utils/emojiCharacters");

const Module = new Augur.Module()
.addCommand({name: "say",
  syntax: "<stuff>",
  category: "Silly",
  hidden: true,
  process: (msg, suffix) => {
    u.clean(msg, 0);
    msg.channel.send(suffix);
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
});

module.exports = Module;
