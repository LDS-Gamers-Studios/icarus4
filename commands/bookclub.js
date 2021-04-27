const Augur = require("augurbot");
const u = require("../utils/utils");
const bookworm = "771734826628677683";

const Module = new Augur.Module()
.addCommand({name: "bookworm",
  description: "Designate a user as a bookworm.",
  syntax: "@user(s) or reset",
  permissions: msg => msg.member && msg.member.roles.cache.has(Module.config.roles.team),
  process: async (msg, suffix) => {
    try {
      let members = u.userMentions(msg, true);
      if (members.size > 0) {
        for (let [id, member] of members) {
          if (member.manageable) await member.roles.add(bookworm);
        }
        msg.react("📚");
      } else if (suffix.toLowerCase() == "reset") {
        let role = msg.guild.roles.cache.get(bookworm);
        for (let [id, member] of role.members) {
          if (member.manageable) await member.roles.remove(bookworm);
        }
        msg.react("📚");
      } else msg.reply("you need to tell me which members are bookworms!").then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
});

module.exports = Module;
