const Augur = require("augurbot"),
  u = require("../utils/utils"),
  modLogs = "506575671242260490",
  SHIELDBREAK = 25;

let ohGoShield = false,
  ohGoTimeout = null;

function setOhGoShield(shield = true) {
  clearTimeout(ohGoTimeout);
  ohGoShield = shield;
  if (shield)
    ohGoTimeout = setTimeout(() => { ohGoShield = false }, 60 * 60 * 1000);
}

const Module = new Augur.Module()
.addCommand({name: "ohgoshield",
  description: "Shield thyself!",
  category: "Silly",
  hidden: true,
  process: (msg) => {
    setOhGoShield(true);
    msg.react("🛡️");
  }
})
.addCommand({name: "swiftkicktotheohgo",
  description: "Give OhGo not the kick he needs, but the kick he deserves.",
  category: "Silly",
  hidden: true,
  permissions: (msg) => msg.guild?.id == Module.config.ldsg && msg.guild.members.cache.has("602887436300714013"),
  process: async (msg) => {
    try {
      let ohGo = msg.guild.members.cache.get("602887436300714013");

      if (ohGoShield) {
        let {balance} = await Module.db.bank.getBalance(msg.author, "em");
        if (balance >= SHIELDBREAK) {
          let breakIt = await u.confirm(msg, `**${ohGo.displayName} is currently shielded!**\nBreak the shield for <:ember:512508452619157504>${SHIELDBREAK}?`);
          if (breakIt) {
            await Module.db.bank.addCurrency({
              discordId: msg.author.id,
              description: `${ohGo.displayName.toUpperCase()} SHIELD BREAK!`,
              currency: "em",
              value: -SHIELDBREAK,
              mod: msg.author.id
            });
            setOhGoShield(false);
          }
        }
      }

      if (!ohGoShield) {
        msg.channel.send("https://media.tenor.com/images/3a34c491eda5278820314be42c2e7db0/tenor.gif");
        await ohGo.send(`You got a swift kick from ${msg.member.displayName}! Come on back when you're ready.\nhttps://ldsg.io/chat`).catch(u.noop);
        msg.guild.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** gave **${u.escapeText(ohGo.displayName)}** a swift kick!`);
        await ohGo.kick(`Swift Kick to the OhGo, by ${msg.member.displayName}`).catch(u.noop);
      } else {
        msg.react("🛡️");
      }
    } catch(error) { u.errorHandler(msg, error); }
  }
});

module.exports = Module;
