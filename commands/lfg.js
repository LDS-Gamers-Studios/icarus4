const Augur = require("augurbot"),
  path = require("path")
  fs = require("fs"),
  lfgBoard = require("../data/lfgboard.json"),
  gameDefaults = require("../data/whoisplaying.json"),
  u = require("../utils/utils");

var update = false,
  lfgChannel = null;

function removePlayer(player, games) {
  if (games.length > 0) {
    games.forEach(game => {
      game.users = game.users.filter(u => u != player);
    });
    lfgBoard.games = lfgBoard.games.filter(g => g.users.length > 0);
  }
  updateBoard(system);
}

function updateBoard(system) {
  // Post updated board
  update = true;

  lfgChannel.fetchMessage(lfgBoard[system].message).then(message => {
		let sys = lfgBoard[system];
		let embed = u.embed()
      .setColor(sys.color)
      .setTitle(`LFG - ${sys.system}`)
      .setDescription(`Currently Looking for Game on ${sys.system}`)
      .setTimestamp()
      .setThumbnail(sys.thumb);

    lfgBoard.games
    .filter(g => g.system == system)
    .sort()
    .forEach(game => {
      embed.addField(game.title, game.users.map(u => channel.guild.members.get(u).displayName).join("\n"), true);
    });
		message.edit(embed);
	});
};

function writeData() {
  if (update) {
    fs.writeFile(path.resolve(process.cwd(), "./data/lfgboard.json"), JSON.stringify(lfgBoard), (err) => {
      if (err) console.error("ERROR WRITING LFG DATA");
    });
    update = false;
  }
};

const Module = new Augur.Module()
.addCommand({name: "lfg",
  description: "Add yourself to the Looking for Game wall!",
  syntax: `(${lfgBoard.systems.join("/")}) Game Name`,
  process: (msg, suffix) => {
    let args = suffix.trim().toLowerCase().replace(/\s\s+/, " ").split(" ");
    if (suffix && (args.length > 1)) {
      let system = args.shift();
      if (lfgBoard.aliases[system]) system = lfgBoard.aliases[system];

      if (lfgBoard.systems.includes(system)) {
        // Add player to log
        suffix = u.properCase(args.join(" "));

        let game = lfgBoard.games.find(g => ((g.system == system) && (g.title == suffix)));
        if (!game) {
          lfgBoard.games.push({system: system, title: suffix, users: []});
          game = lfgBoard.games.find(g => ((g.system == system) && (g.title == suffix)));
        }

        game.users.push(msg.author.id);
        updateBoard(system);

        // Remove player after timeout
        setTimeout(removePlayer, lfgBoard.timeout, msg.author.id, [game]);

        msg.reply(`added you to the list for ${lfgBoard[system].system} - ${suffix} in <#${lfgBoard.channel}>!`);
        u.clean(msg);
      } else {
        msg.reply(`you need to tell me which system and game you're playing! (\`!lfg ${this.usage}\`)`).then(u.clean);
      }
    } else {
      msg.reply(`you need to tell me which system and game you're playing! (\`!lfg ${this.usage}\`)`).then(u.clean);
    }
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.channel.id == "209046676781006849"))
})
.addCommand({name: "donelfg",
  description: "Remove yourself from a LFG list",
  syntax: `(${lfgBoard.systems.join("/")}) Game Name`,
  hidden: true,
  process: (msg, suffix) => {
    let args = suffix.trim().toLowerCase().replace(/\s\s+/, " ").split(" ");
    if (!suffix) {
      // Remove all
      let games = lfgBoard.games.filter(g => g.users.includes(msg.author.id));
      removePlayer(msg.author.id, games);
      msg.reply(`removed you from the list in <#${lfgBoard.channel}>!`).then(u.clean);
    } else if (suffix && (args.length == 1)) {
      // Remove platform
      let system = args.shift();
      if (lfgBoard.aliases[system]) system = lfgBoard.aliases[system];

      if (lfgBoard.systems.includes(system)) {
        let games = lfgBoard.games.filter(g => ((g.system == system) && (g.users.includes(msg.author.id))));
        removePlayer(msg.author.id, games);
        msg.reply(`removed you from the list in <#${lfgBoard.channel}>!`).then(u.clean);
      } else msg.reply("I couldn't understand which system you wanted. Try `!donelfg` to remove yourself from all lists, `!donelfg <system>` to remove yourself from all games on a system, or `!donelfg <system> <game title>` to remove yourself for a particular game.").then(u.clean);
    } else if (suffix && (args.length > 1)) {
      // Particular game
      let system = args.shift();
      if (lfgBoard.aliases[system]) system = lfgBoard.aliases[system];

      if (lfgBoard.systems.includes(system)) {
        suffix = u.properCase(args.join(" ").trim());
        let games = lfgBoard.games.filter(g => ((g.system == system) && (g.title == suffix)));
        removePlayer(msg.author.id, games);
      } else {
        msg.reply("I couldn't understand which system you wanted. Try `!donelfg` to remove yourself from all lists, `!donelfg <system>` to remove yourself from all games on a system, or `!donelfg <system> <game title>` to remove yourself for a particular game.").then(u.clean);
      }
    }
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg))
})
.addCommand({name: "removelfg",
  description: "Remove a game from LFG",
  syntax: `(${lfgBoard.systems.join("/")}) Game Name`,
  process: (msg, suffix) => {
    let args = suffix.trim().toLowerCase().replace(/\s\s+/, " ").split(" ");

    if (suffix && (args.length > 1)) {
      let system = args.shift();
      if (lfgBoard.aliases[system]) system = lfgBoard.aliases[system];

      if (lfgBoard.systems.includes(system)) {
        // Remove game from list
        suffix = u.properCase(args.join(" "));

        if (lfgBoard[system].games[suffix]) {
          delete(lfgBoard[system].games[suffix]);
          updateBoard(system);
          msg.reply(`removed the game from the list in <#${lfgBoard.channel}>!`).then(u.clean);
        } else {
          msg.reply("that game wasn't on the list.").then(u.clean);
        }
      } else {
        msg.reply(`you need to tell me which system and game to remove! (\`${u.prefix(msg)}removelfg ${this.usage}\`)`).then(u.clean);
      }
    } else {
      msg.reply(`you need to tell me which system and game to remove! (\`${u.prefix(msg)}removelfg ${this.usage}\`)`).then(u.clean);
    }
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.permissions.has("MANAGE_MESSAGES"))
})
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
})
.addEvent("message", (msg) => {
  if (msg.channel.id == lfgBoard.channel) msg.delete();
})
.setUnload(writeData)
.setClockwork(() => {
  // Set a timeout to clear existing LFG players, in case of reload.
  lfgChannel = Module.handler.bot.channels.get(lfgBoard.channel);

  lfgBoard.games
  .reduce((a, c) => a.concat(c.users), [])
  .filter((u, i, all) => all.indexOf(u) == i)
  .forEach(u => {
    let games = lfgBoard.games.filter(g => g.users.includes(u));
    setTimeout(removePlayer, lfgBoard.timeout, u, games);
  });

  return setInterval(writeData, 60000);
});

module.exports = Module;
