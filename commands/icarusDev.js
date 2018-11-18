const Augur = require("augurbot"),
  u = require("../utils/utils"),
  Trello = require("simply-trello");

const Module = new Augur.Module()
.addCommand({name: "iamyourdev",
  hidden: true,
  permissions: msg => msg.channel.type == "dm" && msg.client.guilds.get(Module.config.ldsg).members.has(msg.author.id),
  process: async (msg) => {
    try {
      msg.react("👌");
      let botTesting = await msg.client.channels.get("209046676781006849").overwritePermissions(msg.author, { VIEW_CHANNEL: true });
      botTesting.send(`Well, I guess ${msg.author} is my dev now. Please do others a favor and let them find their own way in, rather than telling them though. :grin:`);
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "repo",
  description: "Get a link to the bot's source code.",
  aliases: ["source"],
  process: msg => msg.channel.send("Find my repository here:\n<https://bitbucket.org/Gaiwecoor/icarus3/>")
})
.addCommand({name: "request",
  description: "Request a feature for Icarus",
  info: "Send a feature request to the bot Trello board.",
  syntax: "Requested Feature",
  process: (msg, suffix) => {
    if (suffix) {
      let trelloConfig = require("../config/trello.json");
      let card = {
        path: {
          board: 'Icarus',
          list: 'Requested Features',
          card: suffix,
        },
        content: {
          cardDesc: "Submitted by: " + msg.author.username,
          cardLabelColors: "blue"
        }
      };
      Trello.send(trelloConfig, card, function(err, result){
        if (err) console.error(err);
        else msg.reply("Your request has been submitted!").then(u.clean);
      });
    } else msg.reply("You need to tell me what your request is!");
  }
});

module.exports = Module;
