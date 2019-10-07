const Augur = require("augurbot");
const chars = require("../utils/emojiCharacters");

const Module = new Augur.Module()
.addCommand({name: "say",
  syntax: "<stuff>",
  category: "Silly",
  hidden: true,
  process: (msg, suffix) => {
    if (msg.deletable) msg.delete();
    msg.channel.send(suffix);
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addCommand({name: "esay",
  syntax: "<stuff>",
  category: "Silly",
  hidden: true,
  process: async (msg, suffix) => {
    let params = suffix.split(" ");
    let id = params.shift();
    let str = params.join(" ").replace(/ /g, "").toLowerCase();
    for (let i = 0; i < str.length; i++) await msg.react(chars[str[i]]);
  }
});

module.exports = Module;
