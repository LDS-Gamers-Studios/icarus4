const Augur = require("augurbot"),
  u = require("../utils/utils");

let cooldown = new Map();

const Module = new Augur.Module()
.addEvent("message", (msg) => {
  try {
    let date = new Date();
    if (
      (date.getMonth() == 3 && date.getDate() == 1) &&
      msg.guild &&
      !msg.author.bot &&
      msg.guild.id == "96335850576556032" &&
      (
        !cooldown.has(msg.author.id) ||
        ((date.getTime() - cooldown.get(msg.author.id)) > 120000)
      )
    ) {
      let regex = /(?:^|\.|\?|!|\n|,)\s*(?:I am|I'm|Im|I’m) (.*?)(?:\.|!|,|\?|\n|;|$)/i;
      let match = regex.exec(msg.cleanContent);
      if (match) {
        cooldown.set(msg.author.id, date.getTime());
        let name = match[1];
        msg.member.setNickname(name.length > 32 ? name.substr(0, name.lastIndexOf(" ", 32)) : name)
        .finally(() => {
          msg.channel.send(`Hi, ${u.properCase(name)}. I'm Icarus.`);
        });
      }
    }
  } catch(e) { u.alertError(e, msg); }
});

module.exports = Module;
