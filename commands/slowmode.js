const Augur = require("augurbot");
const u = require("../utils/utils");

const molasses = new Map();

const Module = new Augur.Module()
.addCommand({name: "slowmode",
  description: "Simmer",
  aliases: ["slow", "simmer"],
  syntax: "[duration (minutes)] <cooldown (seconds)>",
  category: "Mod",
  permissions: (msg) => (msg.member && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    try {
      let [duration, cooldown] = suffix.split(" ").map(n => parseInt(n, 10));
      if (duration) {
        let prev = molasses.get(msg.channel.id);
        if (prev) clearTimeout(prev.timeout);
        let limit = prev ? prev.limit : msg.channel.rateLimitPerUser;
        await msg.channel.edit({rateLimitPerUser: cooldown || 15});
        msg.react("⏲️").catch(u.noop);
        msg.guild.channels.cache.get("506575671242260490").send(`⏲️ ${msg.member.displayName} has set a ${cooldown || 15}s slow mode for ${duration} minutes in ${msg.channel}.`).catch(u.noop);
        molasses.set(msg.channel.id, {
          timeout: setTimeout((channel, rateLimitPerUser) => {
            channel.edit({rateLimitPerUser}).catch(error => u.errorHandler(error, "Reset rate limit after slowmode"));
            molasses.delete(channel.id);
          }, duration * 60000, msg.channel, limit),
          limit
        });
      } else msg.reply("you need to tell me how many minutes to slow things!").then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
});

module.exports = Module;
