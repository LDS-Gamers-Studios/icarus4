const Augur = require("augurbot"),
  u = require("../utils/utils");

const gameDefaults = {
  "212418287135358977": "Destiny",
  "336532902932250624": "Destiny",
  "139429936342499329": "Destiny",
  "114419342921170952": "Destiny",
  "114420055428694025": "Minecraft",
  "153616193134133249": "Dark Souls",
  "114420468563443713": "Diablo",
  "114419737064243200": "Elder Scrolls",
  "144900889084297216": "Final Fantasy",
  "126747867053293568": "Guild Wars",
  "407336418336178198": "Monster Hunter",
  "213702216169553921": "World of Warcraft",
  "115593025329168392": "Counter-Strike",
  "124205644122161155": "The Division",
  "340190970916110339": "Fortnite",
  "407256707320774676": "Fortnite",
  "465951382453616660": "Garry's Mod",
  "114418874308493317": "Halo",
  "161709819613413376": "Overwatch",
  "293493444393959434": "Paladins",
  "433362737901338634": "PLAYERUNKNOWN'S BATTLEGROUNDS",
  "340231436751732738": "PLAYERUNKNOWN'S BATTLEGROUNDS",
  "445758677601878047": "PLAYERUNKNOWN'S BATTLEGROUNDS",
  "402567156996243457": "Tom Clancy's Rainbow Six Siege",
  "215179551163154432": "Titanfall",
  "114420275361218569": "Warframe",
  "204691274396073993": "Ark",
  "272894378857594880": "Terraria",
  "114539158432776197": "Hearthstone",
  "328354021180178432": "League of Legends",
  "114420530643337220": "Rocket League",
  "406145046694330378": "Sea of Thieves"
};

const Module = new Augur.Module()
.addCommand({name: "whoisplaying",
	description: "Find who is playing a game in the server",
	suffix: "<game name>",
	aliases: ["who'splaying", "whosplaying", "whoson", "whoison", "who'son", "wip"],
	process: (msg, suffix) => {
    if (!suffix && gameDefaults[msg.channel.id]) suffix = gameDefaults[msg.channel.id];

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
