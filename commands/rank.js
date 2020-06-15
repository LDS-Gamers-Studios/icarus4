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
  process: async function (msg) {
    try {
      let user = (u.userMentions(msg) ? u.userMentions(msg).first() : msg.author);

      let member = msg.client.guilds.get(Module.config.ldsg).members.get(user.id);
      let response = null;

      let memberInfo = await Module.db.user.fetchUser(user);

      if (memberInfo.excludeXP || member.user.bot) {
        if (msg.member && msg.member.roles.has(Module.config.roles.mod)) {
          let userInfo = await Module.db.user.fetchUser(member)
          response = `> **${u.escapeText(member.displayName)}** Activity: ${userInfo.posts} posts.`;
        } else {
          let snark = [
            "don't got time for dat.",
            "ain't interested in no XP gettin'.",
            "don't talk to me no more, so I ignore 'em."
          ];
          response = `**${u.escapeText(member.displayName)}** ${u.rand(snark)}`;
        }
      } else {
        let userDoc = await Module.db.user.findXPRank(user);
        userDoc.level = Rank.level(userDoc.totalXP);
        userDoc.nextLevel = parseInt(Rank.minXp(userDoc.level + 1), 10).toLocaleString();
        response = u.embed()
        .setAuthor(member.displayName, (member.user.displayAvatarURL ? member.user.displayAvatarURL : null))
        .addField("Rank", `Season: ${userDoc.currentRank}/${msg.client.guilds.get(Module.config.ldsg).memberCount}\nLifetime: ${userDoc.lifeRank}/${msg.client.guilds.get(Module.config.ldsg).memberCount}`, true)
        .addField("Level", `Current Level: ${userDoc.level}\nNext Level: ${userDoc.nextLevel} XP`, true)
        .addField("Exp.", `Season: ${parseInt(userDoc.currentXP, 10).toLocaleString()} XP\nLifetime: ${parseInt(userDoc.totalXP, 10).toLocaleString()} XP`, true)
        .setTitle("LDSG Chat Ranking")
        .setURL("http://my.ldsgamers.com/leaderboard")
        .setFooter("http://my.ldsgamers.com/leaderboard");
      }
      msg.channel.send(response);
    } catch(e) {
      u.alertError(e, msg);
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
      let guild = await msg.guild.fetchMembers();
      let users = await Module.db.user.getUsers({currentXP: {$gt: 0}});
      users = users.filter(u => guild.members.has(u.discordId));
      let totalXP = users.reduce((a, c) => a + c.currentXP, 0);
      let rate = dist / totalXP;
      let top3 = users
        .sort((a, b) => b.currentXP - a.currentXP)
        .filter((u, i) => i < 3)
        .map((u, i) => `${(i + 1)}) ${guild.members.get(u.discordId)}`)
        .join("\n");

      if (dist) {
        for (let i = 0; i < users.length; i++) {
          let user = users[i];
          let award = Math.round(rate * user.currentXP);
          if (award) {
            setTimeout(async (user, award) => {
              Module.db.bank.addCurrency({
                discordId: user.discordId,
                description: "Chat Rank Reset - " + (new Date()).toDateString(),
                value: award,
                mod: msg.author.id
              }).then(deposit => {
                guild.members.get(deposit.discordId).send(`${guild.name} Chat Ranks have been reset! You've been awarded ${gb}${deposit.value} for your participation this season!`).catch(u.noop);
              });
            }, 1100 * i, user, award);
          }
        }
      }

      let announce = `__**CHAT RANK RESET!!**__\n\nAnother chat season has come to a close! In the most recent season, we've had ${users.length} active members chatting! The three most active members were:\n${top3}`;
      if (dist > 0) announce += `\n\n${gb}${dist} have been distributed among *all* LDSG members who participated in chat this season, proportional to their participation.`;
      msg.guild.channels.get("121752198731268099").send(announce);

      Module.db.user.resetXP();
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "trackxp",
  description: "Tell Icarus whether to track your chat XP.",
  aliases: ["chatxp"],
  syntax: "true | false",
  process: (msg, suffix) => {
    suffix = suffix.toLowerCase();
    u.clean(msg);
    if (!suffix || suffix == "true" || suffix == "on") {
      Module.db.user.update(msg.author, {excludeXP: false})
      .then((user) => {
        msg.react("👌").catch(u.noop);
      });
    } else if (suffix == "false" || suffix == "off") {
      Module.db.user.update(msg.author, {excludeXP: true})
      .then((user) => {
        msg.react("👌").catch(u.noop);
      });
    } else {
      msg.reply("you need to tell me `on` or `off`.").then(u.clean);
    }
  }
})
.addEvent("message", (msg) => {
  if (msg.guild && (msg.guild.id == Module.config.ldsg) && !active.has(msg.author.id) && !(Rank.excludeChannels.includes(msg.channel.id) || Rank.excludeChannels.includes(msg.channel.parentID)) && !msg.webhookID && !msg.member.roles.has(Module.config.roles.muted) && !u.parse(msg) && !msg.author.bot)
    active.add(msg.author.id);
})
.setClockwork(() => {
  try {
    let bot = Module.handler.client;
    return setInterval(async function(bot) {
      try {
        let response = await Module.db.user.addXp(active);
        if (response.users.length > 0) {
          const ldsg = bot.guilds.get(Module.config.ldsg);
          for (const user of response.users) {
            let member = ldsg.members.get(user.discordId);

            if ((user.posts % 25 == 0) && !member.roles.has(Module.config.roles.trusted) && !member.roles.has(Module.config.roles.untrusted)) {
              let {Collection} = require("discord.js");
              let modLogs = ldsg.channels.get("506575671242260490");
              let gai = ldsg.members.get(Module.config.ownerId);
              await modLogs.send(`${member} has posted ${user.posts} times in chat without being trusted!`);
              Module.handler.execute("fullinfo", {
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
                  let reward = bot.guilds.get(Module.config.ldsg).roles.get(Rank.rewards.get(lvl).id);
                  member.addRole(reward);
                  message += `\n\nYou have been awarded the ${reward.name} role!`;
                }
                member.send(message).catch(u.noop);
              }
            }
          }
        }
        active.clear();
      } catch(e) { u.alertError(e, "Rank clockwork update"); }
    }, 60000, bot);
  } catch(e) { u.alertError(e, "Rank outer clockwork"); }
});

module.exports = Module;
