const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "whoisplaying",
	description: "Find who is playing a game in the server",
	suffix: "<game name>",
	aliases: ["who'splaying", "whosplaying", "whoson", "whoison", "who'son"],
	process: (msg, suffix) => {
		if (suffix) {
			msg.guild.fetchMembers().then(guild => {
				let players = guild.members
          .filter(u => (u.presence.game && (u.presence.game.name.toLowerCase().startsWith(suffix.toLowerCase()))))
          .map(u => `• ${u.displayName}`);
				if (players.length > 0) {
					let embed = u.embed()
					.setTitle(`${msg.guild.name} members currently playing ${suffix}`)
					.setDescription(players.join("\n"))
					.setTimestamp();
					u.botSpam(msg).send(embed);
				} else
				  u.botSpam(msg).send(`I couldn't find any members playing ${suffix}.`);
			});
		} else
			msg.reply("you need to tell me which game to find.").then(u.clean);
	},
	permissions: (msg) => msg.guild
});

module.exports = Module;
