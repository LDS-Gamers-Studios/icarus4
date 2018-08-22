const Augur = require("augurbot"),
  path = require("path")
  fs = require("fs"),
  lfgBoard = require("../data/lfgboard.json"),
  u = require("../utils/utils");

var update = false;

function removePlayer(bot, system, game, player) {
  if (lfgBoard[system].games[game]) {
    lfgBoard[system].games[game] = lfgBoard[system].games[game].filter(p => p != player);
    if (lfgBoard[system].games[game].length == 0) delete(lfgBoard[system].games[game]);

    updateBoard(bot, system);
  }
};

function updateBoard(bot, system) {
  // Post updated board
  update = true;

  bot.channels.get(lfgBoard.channel).fetchMessage(lfgBoard[system].message).then(message => {
		let sys = lfgBoard[system];
		let embed = u.embed()
      .setColor(sys.color)
      .setTitle(`LFG - ${sys.system}`)
      .setDescription(`Currently Looking for Game on ${sys.system}`)
      .setTimestamp()
      .setThumbnail(sys.thumb);

		for (game in sys.games) {
			embed.addField(game, sys.games[game].join("\n"), true);
		}
		message.edit(embed);
	});
};

function writeData() {
  if (update) {
    fs.writeFile(path.resolve(process.cwd(), "../data/lfgboard.json"), JSON.stringify(lfgBoard), (err) => {
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

        if (!lfgBoard[system].games[suffix]) lfgBoard[system].games[suffix] = [];
        lfgBoard[system].games[suffix].push(msg.member.displayName);

        updateBoard(msg.client, system);

        // Remove player after timeout
        setTimeout(removePlayer, lfgBoard.timeout, msg.client, system, suffix, msg.member.displayName);

        msg.reply(`added you to the list for ${lfgBoard[system].system} - ${suffix} in <#${lfgBoard.channel}>!`);
        u.clean(msg);
      } else {
        msg.reply(`you need to tell me which system and game you're playing! (\`!lfg ${this.usage}\`)`).then(u.clean);
      }
    } else {
      msg.reply(`you need to tell me which system and game you're playing! (\`!lfg ${this.usage}\`)`).then(u.clean);
    }
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg))
})
.addCommand({name: "donelfg",
  description: "Remove yourself from a LFG list",
  syntax: `(${lfgBoard.systems.join("/")}) Game Name`,
  process: (msg, suffix) => {
    let args = suffix.trim().toLowerCase().replace(/\s\s+/, " ").split(" ");
    if (suffix && (args.length > 1)) {
      let system = args.shift();
      if (lfgBoard.aliases[system]) system = lfgBoard.aliases[system];

      if (lfgBoard.systems.includes(system)) {
        // Remove player from log
        suffix = u.properCase(args.join(" ").trim());
        let removed = false;
        for (var game in lfgBoard[system].games) {
          if (game.toLowerCase() == suffix.toLowerCase()) {
            removePlayer(msg.client, system, game, msg.member.displayName);
            msg.reply(`removed you from the list in <#${lfgBoard.channel}>!`).then(u.clean);
            removed = true;
          }
        }

        if (!removed) msg.reply("that game wasn't on the list.").then(u.clean);
      } else {
        msg.reply(`you need to tell me which system and game you're playing! (\`!donelfg ${this.usage}\`)`).then(u.clean);
      }
    } else {
      msg.reply(`you need to tell me which system and game you're playing! (\`!donelfg ${this.usage}\`)`).then(u.clean);
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
          updateBoard(msg.client, system);
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
.addEvent("message", (msg) => {
  if (msg.channel.id == lfgBoard.channel) msg.delete();
})
.setUnload(writeData)
.setClockwork(() => {
  // Set a timeout to clear existing LFG players, in case of reload.
  let bot = Module.handler.bot;
  lfgBoard.systems.forEach(system => {
    for (var game in lfgBoard[system].games) {
      lfgBoard[system].games[game].forEach(player => {
        setTimeout(removePlayer, lfgBoard.timeout, bot, system, game, player);
      });
    }
  });

  return setInterval(writeData, 60000);
});

module.exports = Module;
