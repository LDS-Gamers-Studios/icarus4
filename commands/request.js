const Augur = require("augurbot"),
  u = require("../utils/utils"),
  Trello = require("simply-trello");

const Module = new Augur.Module()
.addCommand({name: "request",
  description: "Request a feature for " + Module.handler.bot.user.username,
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
