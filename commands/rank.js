const Augur = require("augurbot"),
  Rank = require("../utils/RankInfo"),
  u = require("../utils/utils");

const active = new Set();

const Module = new Augur.Module()
.setInit((talking) => {
  if (talking)
    for (let user of talking) active.add(user);
})
.setUnload(() => active)
.addCommand({name: "leaderboard",
  description: "View the LDSG Chat Leaderboard",
  aliases: ["levels"],
  process: (msg) => msg.channel.send("LDSG Chat Leaderboard:\nhttp://my.ldsgamers.com/leaderboard")
})
.addCommand({name: "rank",
  description: "View your chat rank",
  syntax: "[@user]",
  permissions: (msg) => msg.guild && msg.guild.id == Module.config.ldsg,
  process: async function (msg) {
    try {
      let member = u.userMentions(msg, true).first() || msg.member;
      let response = null;

      let memberInfo = await Module.db.user.fetchUser(member);

      if (memberInfo.excludeXP || member.user.bot) {
        if (msg.member.roles.cache.has(Module.config.roles.mod)) {
          response = `> **${u.escapeText(member.displayName)}** Activity: ${memberInfo.posts} posts.`;
        } else {
          let snark = [
            "don't got time for dat.",
            "ain't interested in no XP gettin'.",
            "don't talk to me no more, so I ignore 'em."
          ];
          response = `**${u.escapeText(member.displayName)}** ${u.rand(snark)}`;
        }
      } else {
        let userDoc = await Module.db.user.findXPRank(member);
        userDoc.level = Rank.level(userDoc.totalXP);
        userDoc.nextLevel = parseInt(Rank.minXp(userDoc.level + 1), 10).toLocaleString();
        response = u.embed()
        .setAuthor(member.displayName, member.user.displayAvatarURL({dynamic: true}))
        .addField("Rank", `Season: ${userDoc.currentRank}/${msg.guild.memberCount}\nLifetime: ${userDoc.lifeRank}/${msg.guild.memberCount}`, true)
        .addField("Level", `Current Level: ${userDoc.level}\nNext Level: ${userDoc.nextLevel} XP`, true)
        .addField("Exp.", `Season: ${parseInt(userDoc.currentXP, 10).toLocaleString()} XP\nLifetime: ${parseInt(userDoc.totalXP, 10).toLocaleString()} XP`, true)
        .setTitle("LDSG Chat Ranking")
        .setURL("http://my.ldsgamers.com/leaderboard")
        .setFooter("http://my.ldsgamers.com/leaderboard");
      }
      msg.channel.send(response);
    } catch(e) {
      u.errorHandler(e, msg);
    }
  }
})
.addCommand({name: "rankreset",
  description: "Reset the LDSG chat ranks!",
  syntax: "GhostBucksSpread",
  info: "Reset chat ranks and give the indicated number of Ghost Bucks to the members, proportional to their chat XP.",
  permissions: (msg) => Module.config.adminId.includes(msg.author.id) && msg.guild && msg.guild.id == Module.config.ldsg,
  process: async function(msg, suffix) {
    try {
      let gb = "<:gb:493084576470663180>";
      let dist = parseInt(suffix, 10) || 0;
      let members = await msg.guild.members.fetch();
      let users = (await Module.db.user.getUsers({currentXP: {$gt: 0}}))
        .filter(u => members.has(u.discordId));
      let totalXP = users.reduce((a, c) => a + c.currentXP, 0);
      let rate = dist / totalXP;
      let top3 = users
        .sort((a, b) => b.currentXP - a.currentXP)
        .filter((u, i) => i < 3)
        .map((u, i) => `${(i + 1)}) ${members.get(u.discordId)}`)
        .join("\n");

      if (dist) {
        let i = 0;
        for (let user of users) {
          let user = users[i];
          let award = Math.round(rate * user.currentXP);
          if (award) {
            setTimeout(async (user, value) => {
              Module.db.bank.addCurrency({
                discordId: user.discordId,
                description: "Chat Rank Reset - " + (new Date()).toDateString(),
                value,
                mod: msg.author.id
              }).then(deposit => {
                guild.members.get(deposit.discordId).send(`${guild.name} Chat Ranks have been reset! You've been awarded ${gb}${deposit.value} for your participation this season!`).catch(u.noop);
              });
            }, 1100 * i++, user, award);
          }
        }
      }

      let announce = `__**CHAT RANK RESET!!**__\n\nAnother chat season has come to a close! In the most recent season, we've had ${users.length} active members chatting! The three most active members were:\n${top3}`;
      if (dist > 0) announce += `\n\n${gb}${dist} have been distributed among *all* LDSG members who participated in chat this season, proportional to their participation.`;
      msg.guild.channels.channels.get("121752198731268099").send(announce);

      Module.db.user.resetXP();
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "trackxp",
  description: "Tell Icarus whether to track your chat XP.",
  aliases: ["chatxp"],
  syntax: "true | false",
  process: async (msg, suffix) => {
    try {
      suffix = suffix.toLowerCase();
      u.clean(msg);
      if (!suffix || suffix == "true" || suffix == "on") {
        await Module.db.user.update(msg.author, {excludeXP: false});
        msg.react("👌").catch(u.noop);
      } else if (suffix == "false" || suffix == "off") {
        await Module.db.user.update(msg.author, {excludeXP: true});
        msg.react("👌").catch(u.noop);
      } else {
        msg.reply("you need to tell me `on` or `off`.").then(u.clean);
      }
    } catch(error) { u.errorHandler(msg, error); }
  }
})
.addEvent("message", (msg) => {
  if (msg.guild && (msg.guild.id == Module.config.ldsg) && !active.has(msg.author.id) && !(Rank.excludeChannels.includes(msg.channel.id) || Rank.excludeChannels.includes(msg.channel.parentID)) && !msg.webhookID && !u.parse(msg) && !msg.author.bot)
    active.add(msg.author.id);
})
.setClockwork(() => {
  try {
    let bot = Module.client;
    return setInterval(async function(bot) {
      try {
        let response = await Module.db.user.addXp(active);
        if (response.users.length > 0) {
          const ldsg = bot.guilds.cache.get(Module.config.ldsg);
          for (const user of response.users) {
            let member = ldsg.members.cache.get(user.discordId);

            if ((user.posts % 25 == 0) && !member.roles.cache.has(Module.config.roles.trusted) && !member.roles.cache.has(Module.config.roles.untrusted)) {
              let {Collection} = require("discord.js");
              let modLogs = ldsg.channels.cache.get("506575671242260490");
              let gai = ldsg.members.cache.get(Module.config.ownerId);
              await modLogs.send(`${member} has posted ${user.posts} times in chat without being trusted!`);
              Module.client.commands.execute("fullinfo", {
                author: gai.user,
                channel: modLogs,
                client: bot,
                guild: ldsg,
                member: gai,
                mentions: {
                  users: new Collection([[member.id, member.user]]),
                  members: new Collection([[member.id, member]])
                }
              }, member.toString());
            }

            if (!user.excludeXP) {
              let oldXP = user.totalXP - response.xp;
              let lvl = Rank.level(user.totalXP);
              let oldLvl = Rank.level(oldXP);

              if (lvl != oldLvl) {
                let message = u.rand(Rank.messages) + " " + u.rand(Rank.levelPhrase).replace("%LEVEL%", lvl);

                if (Rank.rewards.has(lvl)) {
                  let reward = ldsg.roles.cache.get(Rank.rewards.get(lvl).id);
                  member.roles.add(reward);
                  message += `\n\nYou have been awarded the ${reward.name} role!`;
                }
                member.send(message).catch(u.noop);
              }
            }
          }
        }
        active.clear();
      } catch(e) { u.errorHandler(e, "Rank clockwork update"); }
    }, 60000, bot);
  } catch(e) { u.errorHandler(e, "Rank outer clockwork"); }
});

module.exports = Module;
