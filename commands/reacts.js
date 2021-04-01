const Augur = require("augurbot"),
  u = require("../utils/utils");

const emojis = new u.Collection([
  ["209007104852230145", "403553351775551488"], // Icarus - Why
  ["281658096130981889", "761342618343833670"], // Indigo - lunaping
  ["487085787326840843", "809815185367367710"], // Behold - ablobping - Emoji by Blob Hub Studios, used under Apache 2.0
  //["224230213611945984", "816163983953494026"], // Werecat - bruh
  ["305806858197925890", "826889413296390194"], // Maldor - makeitwhy
  ["481626300654551051", "826896588055117825"], // Razzo - hyperrazzo
  ["123244664030494720", "826893680660316220"], // Dalan - hyperdalan
  ["162084856224808962", "826895229911040000"], // BKO - OtterRoss
  ["117454089385803780", "826899226105479238"], // Caden - ythoping
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
      if (msg.mentions.members.has(sponsor)) msg.react(emoji).catch(u.noop);

    // General Weirdness
    if (Math.random() < .3) {
      if (msg.content.toLowerCase().includes("buttermelon"))
        msg.react(emojis.get("buttermelon")).catch(u.noop);
      if (msg.content.toLowerCase().includes("carp"))
        msg.react("🐟").catch(u.noop);
      if (msg.content.toLowerCase().includes("noice"))
        msg.react(emojis.get("noice")).catch(u.noop);
    }
  }
})
.addEvent("ready", () => {
  for (const [key, value] of emojis) {
    let emoji = Module.client.emojis.cache.get(value);
    emojis.set(key, emoji || value);
  }
});

module.exports = Module;
