const u = require("../utils/utils"),
  Augur = require("augurbot");

const Module = new Augur.Module()
.addCommand({name: "choose",
  description: "Chooses between options",
  syntax: "<option1> | <option2> | <option3> ...",
  info: "Helps make a choice!",
  aliases: ["decide", "pick", "choice"],
  process: (msg, suffix) => {
    if (suffix && suffix.includes("|")) {

      let decideText = ["I choose", "I pick", "I decided"];
      decideText = decideText[Math.floor(Math.random() * decideText.length)];

      let choices = suffix.split("|");
      let chosen = choices[Math.floor(Math.random() * choices.length)].trim();

      msg.reply(`${decideText} **${chosen}**`);
    } else {
      msg.reply("you need to give me two or more choices!").then(u.clean);
    }
  }
})
.addCommand({name: "cheapshark",
  description: "Searches CheapShark for game deals",
  syntax: "Game",
  aliases: ["deals"],
  process: (msg, suffix) => {
    if (suffix) msg.channel.send(`Find deals for ${suffix} here:\nhttps://www.cheapshark.com/browse?title=${encodeURIComponent(suffix.trim())}`);
    else msg.reply("you need to give me a game to find!").then(u.clean);
  }
});

module.exports = Module;
