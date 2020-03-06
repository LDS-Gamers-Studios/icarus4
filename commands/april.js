const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addEvent("message", (msg) => {
  try {
    let date = new Date();
    if (!msg.author.bot && msg.guild && ((msg.guild.id == "136569499859025920") || (date.getMonth() == 3 && date.getDate() == 1))) {
      let regex = /(?:^|\.|\?|!|\n)\s*(?:I am|I'm) (.*?)(?:\.|!|\?|\n|$)/i;
      let match = regex.exec(msg.cleanContent);
      if (match) {
        let name = u.properCase(match[1]);
        msg.member.setNickname(name)
        .then(member => {
          msg.channel.send(`Hi, ${member}. I'm Icarus.`);
        })
        .catch(() => {
          msg.channel.send(`Hi, ${name}. I'm Icarus.`);
        });
      }
    }
  } catch(e) { u.alertError(e, msg); }
});

module.exports = Module;
