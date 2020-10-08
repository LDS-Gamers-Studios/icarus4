const Augur = require("augurbot"),
  u = require("../utils/utils");

const emojis = new u.Collection([
  ["209007104852230145", "403553351775551488"], // Icarus - Why
  ["281658096130981889", "761342618343833670"], // Indigo - lunaping
  ["buttermelon",        "305039588014161921"],
  ["noice",              "633500960483704843"],
  ["why",                "403553351775551488"]
]);

const Module = new Augur.Module()
.addEvent("message", (msg) => {
  if (!msg.author.bot && msg.guild && msg.guild.id == Module.config.ldsg) {
    let bot = msg.client;

    // Sponsor Pings
    for (const [sponsor, emoji] of emojis)
      if (msg.mentions.members.has(sponsor)) msg.react(bot.emojis.cache.get(emoji)).catch(u.noop);

    // General Weirdness
    if (Math.random() < .3) {
      if (msg.content.toLowerCase().includes("buttermelon"))
        msg.react(bot.emojis.cache.get(emojis.get("buttermelon"))).catch(u.noop);
      if (msg.content.toLowerCase().includes("carp"))
        msg.react("🐟").catch(u.noop);
      if (msg.content.toLowerCase().includes("noice"))
        msg.react(bot.emojis.cache.get(emojis.get("noice"))).catch(u.noop);
      if (msg.channel.id == "762505119710969946" && msg.content.toLowerCase().includes("taco"))
        msg.react("🌮").catch(u.noop);
      if (msg.channel.id == "762505078531293205" && msg.content.toLowerCase().includes("sword"))
        msg.react("⚔️").catch(u.noop);
    }
  }
});

module.exports = Module;
