const Augur = require("augurbot"),
  Rank = require("../utils/RankInfo"),
  u = require("../utils/utils"),
  threshold = 5;

const starboard = "405405857099284490";

const active = new Set();
const excludeUsers = new Set();

async function updateStarboard(message) {
  try {
    let bot = message.client;
    let {count, valid} = validate(message);

    for (const reaction of message.reactions.filter(r => (!r.emoji.guild || (r.emoji.guild.id == Module.config.ldsg))).size) {
      let users = await reaction.fetchUsers();
      reaction.count = users.size;
    };

    let embed = u.embed()
    .setAuthor(message.member.displayName, message.author.displayAvatarURL)
    .setTimestamp(message.createdAt)
    .setDescription(message.cleanContent)
    .setColor((valid ? "DARK_GOLD" : null))
    .addField("Channel", message.channel.name)
    .addField("Jump to post", message.url)
    .setFooter(message.reactions.filter(r => (!r.emoji.guild || (r.emoji.guild.id == Module.config.ldsg))).map(r => `${r.emoji.name} ${r.count}`).join(" | "));

    if (message.attachments && (message.attachments.size > 0))
    embed.setImage(message.attachments.first().url);

    let star = await Module.db.starboard.fetchStar(message.id);
    if (star && !star.deny) {
      let m = await bot.channels.get(starboard).fetchMessage(star.starId);
      m.edit(embed);
    } else {
      let m = await bot.channels.get(starboard).send(embed);
      Module.db.starboard.saveStar(message, m);
    }
  } catch(e) { u.alertError(e); }
};

function validate(message) {
  let stars = (message.reactions.has("⭐") ? message.reactions.get("⭐").users.size : 0);
  let superstars = (message.reactions.has("🌟") ? message.reactions.get("🌟").users.size : 0);
  let team = message.guild.roles.get(Module.config.roles.mod);
  let management = message.guild.roles.get(Module.config.roles.management);
  let valid = (superstars ? message.reactions.get("🌟").users.reduce((v, u) => v || team.members.has(u.id) || management.members.has(u.id), false) : 0);
  let count = Math.max(stars, superstars);
  return {count, valid};
};

const Module = new Augur.Module()
.setInit(() => {
  Module.db.user.getUsers({excludeXP: true})
  .then(users => {
    for (let i = 0; i < users.length; i++) {
      excludeUsers.add(users[i].discordId);
    }
  });
})
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
      if (excludeUsers.has(member.id) || member.user.bot) {
        let snark = [
          "don't got time for dat.",
          "ain't interested in no XP gettin'.",
          "don't talk to me no more, so I ignore 'em."
        ];
        response = `**${member.displayName}** ${u.rand(snark)}`;
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
      Module.handler.errorHandler(e, msg);
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

      users.forEach(user => {
        let award = Math.round(rate * user.currentXP);
        Module.db.bank.addCurrency({
          discordId: user.discordId,
          description: "Chat Rank Reset - " + (new Date()).toDateString(),
          value: award,
          mod: msg.author.id
        }).then(deposit => {
          guild.members.get(deposit.discordId).send(`${guild.name} Chat Ranks have been reset! You've been awarded ${gb}${deposit.value} for your participation this season!`);
        });
      });

      msg.guild.channels.get("121752198731268099").send(`__**CHAT RANK RESET!!**__\n\nAnother chat season has come to a close! In the most recent season, the three most active members were:\n${top3}\n\n${gb}${dist} have been distributed among *all* LDSG members who participated in chat this season!`);

      Module.db.user.resetXP();
    } catch(e) { Module.handler.errorHandler(e); }
  }
})
.addCommand({name: "trackxp",
  description: "Tell Icarus whether to track your chat XP.",
  syntax: "true | false",
  process: (msg, suffix) => {
    suffix = suffix.toLowerCase();
    if (suffix == "true") {
      Module.db.user.update(msg.author, {excludeXP: false})
      .then((user) => {
        if (excludeUsers.has(user.discordId)) excludeUsers.delete(user.discordId);
        msg.reply("I'll keep track of your chat XP!");
      });
    } else if (suffix == "false") {
      Module.db.user.update(msg.author, {excludeXP: true})
      .then((user) => {
        if (!excludeUsers.has(user.discordId)) excludeUsers.add(user.discordId);
        msg.reply("I won't track your chat XP anymore!");
      });
    } else msg.reply("you need to tell me `true` or `false` for tracking your chat XP!");
  }
})
.addEvent("message", (msg) => {
  if (msg.guild && (msg.guild.id == Module.config.ldsg) && !active.has(msg.author.id) && !(Rank.excludeChannels.includes(msg.channel.id) || Rank.excludeChannels.includes(msg.channel.parentID)) && !u.parse(msg) && !excludeUsers.has(msg.author.id) && !msg.author.bot)
		active.add(msg.author.id);
})
.addEvent("messageReactionAdd", (reaction, user) => {
  let message = reaction.message;
  if (message.guild && (message.guild.id == Module.config.ldsg) && !message.author.bot) {
    if (reaction.emoji.name == "🚫" && (message.channel.id == starboard) && (message.guild.roles.get(Module.config.roles.mod).members.has(user.id))) {
      if (message.embeds[0].color == null) {
        message.delete();
        Module.db.starboard.denyStar(message);
      }
    } else {
      let {count, valid} = validate(message);
      if ((valid || (count >= threshold)) && !Rank.excludeChannels.includes(message.channel.id))
        updateStarboard(message);
    }
  }
})
.addEvent("messageReactionRemove", (reaction, user) => {
  let message = reaction.message;
	if (message.guild && (message.guild.id == Module.config.ldsg)) {
		let {count, valid} = validate(message);
		if ((valid || (count >= threshold)) && !Rank.excludeChannels.includes(message.channel.id))
      updateStarboard(message);
	}
})
.setClockwork(() => {
  try {
    let bot = Module.handler.client;
    return setInterval(async function(bot) {
      try {
        let response = await Module.db.user.addXp(active);
        if (response.users.length > 0) {
          response.users.forEach(user => {
            let oldXP = user.totalXP - response.xp;
            let lvl = Rank.level(user.totalXP);
            let oldLvl = Rank.level(oldXP);

            if (lvl != oldLvl) {
              let member = bot.guilds.get(Module.config.ldsg).members.get(user.discordId);
              let message = u.rand(Rank.messages) + " " + u.rand(Rank.levelPhrase).replace("%LEVEL%", lvl);

              if (Rank.rewards.has(lvl)) {
                let reward = bot.guilds.get(Module.config.ldsg).roles.get(Rank.rewards.get(lvl).id);
                member.addRole(reward);
                message += `\n\nYou have been awarded the ${reward.name} role!`;
              }
              member.send(message).catch(u.alertError).catch(u.alertError);
            }
          });
        }
        active.clear();

        //await Module.db.user.addStars(stars);
        //stars = {};
      } catch(e) { u.alertError(e); }
    }, 60000, bot);
  } catch(e) { u.alertError(e); }
});

module.exports = Module;
