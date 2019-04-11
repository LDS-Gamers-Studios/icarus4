const Augur = require("augurbot"),
  path = require("path")
  fs = require("fs"),
  lfgBoard = require("../data/lfgboard.json"),
  gameDefaults = require("../data/whoisplaying.json"),
  u = require("../utils/utils");

var update = false,
  lfgChannel = null;

function currentPlayers(msg, game) {
  // List people playing the game
  let embed = u.embed()
  .setTitle(`${msg.guild.name} members currently playing ${game}`)
  .setTimestamp();

  let players = msg.guild.members
  .filter(u => (!u.user.bot && u.presence.game && (u.presence.game.name.toLowerCase().startsWith(game.toLowerCase()))))
  .sort((a, b) => a.displayName.localeCompare(b.displayName))
  .map(user => `• ${u.escapeText(user.displayName)}`);

  if (players.length > 0)
    embed.setDescription(players.join("\n"));
  else
    embed.setDescription(`I couldn't find any members playing ${game}.`);

  return embed;
}

async function reloadList(msg, game) {
  try {
    await msg.react("🔁");
    let reactions = await msg.awaitReactions(
      (reaction, user) => ((reaction.emoji.name == "🔁") && !user.bot),
      {max: 1, time: 600000}
    );

    if (reactions.size > 0) {
      let embed = currentPlayers(msg, game);
      await msg.clearReactions();
      msg = await msg.edit(embed);
      reloadList(msg, game);
    } else msg.delete();
  } catch(e) { u.alertError(e); }
}

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
  category: "LFG",
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
  category: "LFG",
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
  hidden: true,
  category: "LFG",
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
.addCommand({name: "wip",
  description: "Find who is playing a game in the server or list all games being played.",
  suffix: "<game name>",
  info: "Search for server members playing <game name>. If no game is provided, it will search for the applicable game in game specific channels or list the top 25 games, otherwise.",
  aliases: ["who'splaying", "whosplaying", "whoson", "whoison", "who'son", "whoisplaying"],
  category: "LFG",
  process: async function(msg, suffix) {
    try {
      u.clean(msg);

      if (!suffix && gameDefaults[msg.channel.id]) suffix = gameDefaults[msg.channel.id];

      let guild = await msg.guild.fetchMembers();

      if (suffix) {
        let embed = currentPlayers(msg, suffix);
        let m = await msg.channel.send(embed);
        reloadList(m, suffix);
      } else {
        // List *all* games played
        let gameList = Array.from(
          guild.members
          .reduce((games, m) => {
            if (!m.user.bot) {
              let game = (m.presence.game && m.presence.game.type==0 ? m.presence.game.name : null);
              if (game && !games.has(game)) games.set(game, {game: game, players: 0});
              if (game) games.get(game).players++;
            }
            return games;
          }, new Map())
          .values()
        )
        .filter(g => g.players > 1)
        .sort((a, b) => {
          if (b.players == a.players) return a.game.localeCompare(b.game);
          else return b.players - a.players
        })
        .filter((g, i) => i < 25);

        let embed = u.embed()
        .setTitle("Currently played games in " + msg.guild.name)
        .setDescription("The top 25 games currently being played in " + msg.guild.name + " (with more than one player):")
        .setTimestamp();

        if (gameList.length > 0) {
          gameList.forEach(g => {
            embed.addField(g.game, g.players, true);
          });
        } else embed.setDescription("Well, this is awkward ... I couldn't find any games with more than one member playing.");

        u.botSpam(msg).send(embed);
      }
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
  },
  permissions: (msg) => msg.guild
})
.addEvent("message", (msg) => {
  if (msg.channel.id == lfgBoard.channel) msg.delete();
})
.setUnload(writeData)
.setClockwork(() => {
  try {
    // Set a timeout to clear existing LFG players, in case of reload.
    lfgChannel = Module.handler.client.channels.get(lfgBoard.channel);

    lfgBoard.games
    .reduce((a, c) => a.concat(c.users), [])
    .filter((u, i, all) => all.indexOf(u) == i)
    .forEach(u => {
      let games = lfgBoard.games.filter(g => g.users.includes(u));
      setTimeout(removePlayer, lfgBoard.timeout, u, games);
    });

    return setInterval(writeData, 60000);
  } catch(e) { u.alertError(e); }
});

module.exports = Module;
