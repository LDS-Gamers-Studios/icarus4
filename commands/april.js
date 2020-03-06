const Augur = require("augurbot"),
  u = require("../utils/utils");

let cooldown = new Map();

const Module = new Augur.Module()
.addEvent("message", (msg) => {
  try {
    let date = new Date();
    if (
      !msg.author.bot &&
      msg.guild &&
      (
        (msg.guild.id == "136569499859025920") ||
        (date.getMonth() == 3 && date.getDate() == 1)
      ) &&
      (
        !cooldown.has(msg.author.id) ||
        ((date.getTime() - cooldown.get(msg.author.id)) > 120000)
      )
    ) {
      let regex = /(?:^|\.|\?|!|\n)\s*(?:I am|I'm|Im) (.*?)(?:\.|!|\?|\n|$)/i;
      let match = regex.exec(msg.cleanContent);
      if (match) {
        cooldown.set(msg.author.id, date.getTime());
        let name = u.properCase(match[1]);
        msg.member.setNickname(name)
        .finally(() => {
          msg.channel.send(`Hi, ${name}. I'm Icarus.`);
        });
      }
    }
  } catch(e) { u.alertError(e, msg); }
});

module.exports = Module;
