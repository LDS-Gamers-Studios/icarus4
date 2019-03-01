const Augur = require("augurbot"),
  u = require("../utils/utils"),
  Trello = require("simply-trello"),
  trelloConfig = require("../config/trello.json");

function processClips(msg1, msg2 = null) {
  let msg = (msg2 ? msg2 : msg1);
  if (!msg.author.bot && msg.channel.id == "153309871297658880") {
    let linkTest = /http(s)?:\/\/[\w\.\/\?\=\%\&\-]+/gi,
      links = [],
      link, found;

    while ((found = linkTest.exec(msg.cleanContent)) !== null) {
      links.push(found[0]);
    }

    if (links.length > 1) msg.reply("submit one link at a time, please!");

    if (links.length > 0) {
      link = links[0];
      let time = new Date();
      let comment = msg.content.replace(linkTest, "").replace(/<>/g, "").trim();
      if (!comment) comment = "No comment submitted";
      let card = {
        path: {
          board: 'Top 10 Clips',
          list: 'Submitted Clips',
          card: `${msg.member.displayName} ${((time) ? (time.toLocaleString()) : (""))}`
        },
        content: {
          cardDesc: link,
          cardLabelColors: "blue",
          cardComment: comment
        }
      };
      try {
        Trello.send(trelloConfig, card, function(err, result) {
          if (err) {
            console.error(err);
          } else {
            msg.react("👌");
          }
        });
      }
      catch(err) {
        console.error("Something went wrong with posting to the Trello board:", err);
      }
    }
  }
}

const Module = new Augur.Module()
.addEvent("message", processClips)
.addEvent("messageUpdate", processClips);

module.exports = Module;
