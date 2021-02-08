const Augur = require("augurbot"),
  u = require("../utils/utils"),
  modLogs = "506575671242260490",
  kickme = "808352598205661196",
  ember = "<:ember:512508452619157504>",
  SHIELDBREAK = 25;

const shield = new u.Collection();

function clearShield(memberId) {
  if (shield.get(memberId)?.shields > 0)
    shield.get(memberId).shields--;
}

const Module = new Augur.Module()
.addCommand({name: "shield",
  description: "Shield thyself!",
  category: "Silly",
  hidden: true,
  permissions: msg.guild?.id == Module.config.ldsg,
  process: async (msg) => {
    let target = msg.mentions.members.first() || msg.member;
    if (!target.roles.cache.has(kickme)) return msg.reply(`${member.displayName} hasn't opted in to get a swift kick! They don't need a shield.`).then(u.clean);
    else if (shield.get(target.id)?.shields > 0) { // Already shielded
      let s = shield.get(target.id).shields;
      let cost = s * SHIELDBREAK;
      let {balance} = await Module.db.bank.getBalance(msg.author, "em");
      if (balance >= cost) {
        let shieldIt = await u.confirm(msg, `**${target.displayName} already has ${s} ${s > 1 ? "shields", "shield"}!**\nAdd another shield layer for ${ember}${cost}?`);
        if (shieldIt) {
          await Module.db.bank.addCurrency({
            discordId: msg.author.id,
            description: `${target.displayName} shield!`,
            currency: "em",
            value: -cost,
            mod: msg.author.id
          });
          shield.get(target.id).shields++;
          shield.get(target.id).timeouts.add(setTimeout(clearShield, 60 * 60 * 1000, target.id));
          msg.react("🛡️");
        } else msg.react("❌");
      } else {
        msg.reply(`${target.displayName} is already shielded and you don't have enough ${ember} to add another layer!`);
      }
    } else {
      shield.set(target.id, {
        shields: 1,
        timeouts: new Set([setTimeout(clearShield, 60 * 60 * 1000, target.id)])
      });
      msg.react("🛡️");
    }
  }
})
.addCommand({name: "swiftkick",
  description: "Give someone not the kick they need, but the kick they deserve.",
  info: "Beware. This may backfire if your target doesn't want to be kicked.",
  aliases: ["swiftkicktotheohgo"],
  category: "Silly",
  hidden: true,
  permissions: (msg) => msg.guild?.id == Module.config.ldsg,
  process: async (msg) => {
    try {
      let target = msg.mentions.members.first();

      if (target?.roles.cache.has(kickme)) {
        if (shield.get(target.id)?.shields > 0) {
          let {balance} = await Module.db.bank.getBalance(msg.author, "em");
          let s = shield.get(target.id).shields;
          let breakCost = s * (s + 1) * SHIELDBREAK / 2;
          if (balance >= breakCost) {
            let breakIt = await u.confirm(msg, `**${target.displayName} is currently shielded ${s} ${s > 1 ? "times" : "time"}!**\nBreak the shield for ${ember}${breakCost}?`);
            if (breakIt) {
              await Module.db.bank.addCurrency({
                discordId: msg.author.id,
                description: `${target.displayName.toUpperCase()} SHIELD BREAK!`,
                currency: "em",
                value: -breakCost,
                mod: msg.author.id
              });
              for (const timeout of shield.get(target.id).timeouts) {
                clearTimeout(timeout);
              }
              shield.delete(target.id);
            }
          }
        }

        if (!shield.get(target.id)?.shields) {
          if (!msg.client.ignoreNotifications) msg.client.ignoreNotifications = new Set();
          msg.client.ignoreNotifications.add(target.id);

          msg.channel.send("https://media.tenor.com/images/3a34c491eda5278820314be42c2e7db0/tenor.gif");
          await target.send(`You got a swift kick from ${msg.member.displayName}! Come on back when you're ready.\nhttps://ldsg.io/chat`).catch(u.noop);
          await target.kick(`Swift Kick from ${msg.member.displayName}`).catch(u.noop);
        } else {
          msg.react("🛡️");
        }
      } else if (target) {
        msg.reply(`${target.displayName} hasn't said it's ok to kick them! Be careful ... this may backfire in the future.`).then(u.clean);
      } else {
        msg.reply(`you need to tell me who needs a swift kick! (Only those with the \`${msg.guild.roles.cache.get(kickme).name}\` role will work.)`).then(u.clean);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.setInit((shielded) => {
  if (shielded?.size > 0) {
    for (const [memberId, shieldState]) shield.set(memberId, shieldState);
  }
})
.setUnload(() => {
  return shield;
});

module.exports = Module;
