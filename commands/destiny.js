const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "dclanadd",
  description: "Add a user to a Destiny clan chat.",
  syntax: "@user(s) Clan Name",
  permissions: msg => msg.member?.roles.cache.some(r => ["803315372613697536", "799005797752635445", "799015418253017098", "799015522003451904"].includes(r.id)),
  process: async (msg, suffix) => {
    const channelRef = new u.Collection([
      ["PC1", "814187227693187102"],
      ["PC2", "814187436611207208"],
      ["PC3", "814187580723560498"],
      ["PS1", "814187685748015114"],
      ["PS2", "814187784218607676"],
      ["XB1", "814187956255981658"],
      ["XB2", "814188049936154644"],
      ["XB3", "814188137000599592"]
    ]);

    let name = suffix.replace(/<@!?\d+>/g, "").replace(/\s/g, "").toUpperCase();

    if (msg.mentions.members.size() == 0) {
      msg.react("❌").catch(u.noop);
      msg.reply("you need to @mention the user(s) you want to add to the channel.").then(u.clean);
    } else if (!channelRef.has(name)) {
      msg.react("❌").catch(u.noop);
      msg.reply(`I couldn't find the right channel for \`${name}\`. Available clans include:\n>>> ${Array.from(channelRef.keys()).join("\n")}`);
    } else {
      let channel = msg.guild.channels.cache.get(channelRef.get(name));
      if (!channel) {
        return msg.reply("sorry, I couldn't fetch the right channel. Try again in a bit?").then(u.clean);
      } else {
        try {
          for (const [memberId, member] of msg.mentions.members) {
            await channel.createOverwrite(member, {"VIEW_CHANNEL": true});
            channel.send(`${member} has been added to the channel!`);
          }
          msg.react("👌").catch(u.noop);
        } catch(error) {
          u.errorHandler(error, msg);
          msg.reply(`I ran into an error trying to add ${member.displayName} to ${channel}.`).then(u.clean);
          msg.react("❌").catch(u.noop);
        }
      }
    }
  }
});

module.exports = Module;
