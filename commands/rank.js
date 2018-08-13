const Augur = require("augurbot"),
  Rank = require("../utils/RankInfo"),
  u = require("../utils/utils");

var active = [],
  stars = {};

function updateStarboard(reaction) {
  let message = reaction.message;
  let bot = message.client;

	let embed = u.embed()
		.setAuthor(message.member.displayName, message.author.displayAvatarURL)
		.setTimestamp(message.createdAt)
		.setDescription(message.cleanContent)
		.setFooter("⭐" + reaction.users.size)
		.setColor((validate(reaction) ? "DARK_GOLD" : null))
		.addField("Channel", message.channel.name);

	if (message.attachments && (message.attachments.size > 0))
		embed.setImage(message.attachments.first().url);

	Module.db.starboard.fetchStar(message.id).then(star => {
		if (star && !star.deny) {
			bot.channels.get(starboard).fetchMessage(star.starId).then(m => {
				m.edit(embed);
			});
		} else {
			bot.channels.get(starboard).send(embed).then(m => {
				Module.db.starboard.saveStar(message, m);
			});
		}
	}).catch(console.error);
};

function validate(reaction) {
  let team = reaction.message.guild.roles.get(Module.config.roles.team);
  let valid = reaction.users.reduce((v, u) => (team.members.has(u.id) ? v++ : v));
  return valid;
};

const Module = new Augur.Module()
.addCommand({name: "leaderboard",
  description: "View the LDSG Chat Leaderboard",
  aliases: ["levels"],
  process: (msg) => msg.channel.send("LDSG Chat Leaderboard:\nhttp://my.ldsgamers.com/leaderboard")
})
.addCommand({name: "rank",
	description: "View your chat rank",
	syntax: "[@user]",
	process: async function (msg) {
		let user = msg.author.id;
		if (u.userMentions(msg)) user = u.userMentions(msg).first();

		let userDoc = await Module.db.user.findXPRank(user);
		let member = msg.client.guilds.get(ldsg).members.get(userDoc.discordId);
		let response = null;
		if (Rank.excludeUsers.includes(member.id) || member.user.bot) {
			let snark = [
				"don't got time for dat.",
				"ain't interested in no XP gettin'.",
				"don't talk to me no more, so I ignore 'em."
			];
			response = `**${member.displayName}** ${u.rand(snark)}`;
		} else {
			userDoc.level = Rank.level(userDoc.totalXP);
			userDoc.nextLevel = parseInt(Rank.minXp(userDoc.level + 1), 10).toLocaleString();
			response = u.embed()
				.setAuthor(member.displayName, (member.user.displayAvatarURL ? member.user.displayAvatarURL : null))
				.addField("Rank", `Current: ${userDoc.currentRank}/${msg.client.guilds.get(ldsg).memberCount}\nLifetime: ${userDoc.lifeRank}/${msg.client.guilds.get(ldsg).memberCount}`, true)
				.addField("Level", `Current Level: ${userDoc.level}\nNext Level: ${userDoc.nextLevel} XP`, true)
				.addField("Exp.", `Current: ${parseInt(userDoc.currentXP, 10).toLocaleString()} XP\nLifetime: ${parseInt(userDoc.totalXP, 10).toLocaleString()} XP`, true)
				.setTitle("LDSG Chat Ranking")
				.setURL("http://my.ldsgamers.com/leaderboard")
				.setFooter("http://my.ldsgamers.com/leaderboard");
		}
		u.botSpam(msg).send(response);
	}
})
.addEvent("message", (msg) => {
  if (msg.guild && (msg.guild.id == Module.config.ldsg) && !msg.author.bot && !Rank.excludeChannels.includes(msg.channel.id) && !Rank.excludeUsers.includes(msg.author.id) && !u.parse(msg) && !active.includes(msg.author.id))
		active.push(msg.author.id);
})
.addEvent("messageReactionAdd", (reaction, user) => {
  let message = reaction.message;
  if (message.guild && (message.guild.id == Module.config.ldsg) && (reaction.emoji.name == "⭐") && !message.author.bot) {
		if (user.id != message.author.id) {
			let valid = validate(reaction);
			if ((valid == 1) && message.guild.roles.get(teamRole).members.has(user.id)) {
				// add all stars
				if (stars[message.author.id]) stars[message.author.id] += reaction.users.size;
				else stars[message.author.id] = reaction.users.size;
			} else if (valid) {
				// add one star
				if (stars[message.author.id]) stars[message.author.id]++;
				else stars[message.author.id] = 1;
			}

			if (valid || ((reaction.users.size > threshold) && !Rank.excludeChannels.includes(message.channel.id))) updateStarboard(reaction);
		} else {
			reaction.remove(user);
			message.reply("you can't star your own message, silly.").then(u.clean);
		}
	} else if (message.guild && (message.guild.id == Module.config.ldsg) && (reaction.emoji.name == "🚫") && (message.channel.id == starboard) && (message.guild.roles.get(Module.config.roles.team).members.has(user.id))) { // Remove from star board
		let deniable = (message.embeds[0].color == null);
		if (deniable) {
			message.delete();
			Module.db.starboard.denyStar(message);
		}
	}
})
.addEvent("messageReactionRemove", (reaction, user) => {
  let message = reaction.message;
	if (message.guild && (message.guild.id == ldsg) && (reaction.emoji.name == "⭐") && (user.id != message.author.id)) {
		let valid = validate(reaction);
		if (valid) {
			if (stars.hasOwnProperty(message.author.id)) stars[message.author.id] -= 1;
			else stars[message.author.id] = -1;
		} else if (message.guild.roles.get(teamRole).members.has(user.id)) {
			if (stars.hasOwnProperty(message.author.id)) stars[message.author.id] -= (reaction.users.size + 1);
			else stars[message.author.id] = 0 - (reaction.users.size + 1);
		}
		if (valid || ((reaction.users.size >= threshold) && !excludeChannels.includes(message.channel.id)) || message.guild.roles.get(teamRole).members.has(user.id)) updateStarboard(reaction);
	}
})
.setClockwork((bot) => {
  bot.channels.get("405405857099284490").fetchMessages().then((messages) => { console.log(`Fetched ${messages.size} stars`)});
	return setInterval(function(bot) {
		Module.db.user.addXp(active).then((response) => {
			if (response.users.length > 0) {
				response.users.forEach(user => {
					let oldXP = user.totalXP - response.xp;
					let lvl = Rank.level(user.totalXP);
					let oldLvl = Rank.level(oldXP);

					if (lvl != oldLvl) {
						let member = bot.guilds.get(ldsg).members.get(user.discordId);
						let message = u.rand(Rank.messages) + " " + u.rand(Rank.levelPhrase).replace("%LEVEL%", lvl);

						if (Rank.rewards.has(lvl)) {
							let reward = bot.guilds.get(Module.config.ldsg).roles.get(Rank.rewards.get(lvl).id);
							member.addRole(reward);
							message += `\n\nYou have been awarded the ${reward.name} role!`;
						}
						member.send(message);
					}
				});
			}
			active = [];
		}).catch(console.error);

		Module.db.user.addStars(stars).then(() => {
			stars = {};
		});
	}, 60000, bot);
});

module.exports = Module;
