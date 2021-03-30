const Augur = require("augurbot"),
  path = require("path")
  fs = require("fs"),
  gameDefaults = new Map(),
  u = require("../utils/utils");

function currentPlayers(msg, game) {
  // List people playing the game
  let embed = u.embed()
  .setTitle(`${msg.guild.name} members currently playing ${game}`)
  .setTimestamp();

  let players = [];

  for (let [memberId, member] of msg.guild.members.cache) {
    if (member.user.bot) continue;
    let presence = member.presence.activities.filter(a => a.type == "PLAYING" && a.name.toLowerCase().startsWith(game.toLowerCase()))[0];
    if (presence) players.push(`• ${u.escapeText(member.displayName)}`);
  }

  players.sort((a, b) => a.localeCompare(b));

  if (players.length > 0)
    embed.setDescription(players.join("\n"));
  else
    embed.setDescription(`I couldn't find any members playing ${game}.`);

  return embed;
}

const Module = new Augur.Module()
.addCommand({name: "wip",
  description: "Find who is playing a game in the server or list all games being played.",
  suffix: "<game name>",
  info: "Search for server members playing <game name>. If no game is provided, it will search for the applicable game in game specific channels or list the top 25 games, otherwise.",
  aliases: ["who'splaying", "whosplaying", "whoson", "whoison", "who'son", "whoisplaying"],
  category: "LFG",
  process: async function(msg, suffix) {
    try {
      u.clean(msg);

      if (!suffix && gameDefaults.has(msg.channel.id)) suffix = gameDefaults.get(msg.channel.id);

      //let members = await msg.guild.members.fetch({withPresences: true});
      let members = msg.guild.members.cache;

      if (suffix) {
        let embed = currentPlayers(msg, suffix);
        let m = await msg.channel.send({embed});

        try {
          let reacted = 0;
          do {
            await m.react("🔁");
            let reactions = await m.awaitReactions(
              (reaction, user) => ((reaction.emoji.name == "🔁") && !user.bot),
              {max: 1, time: 600000}
            );

            reacted = reactions.size;
            if (reacted) {
              let embed = currentPlayers(m, suffix);
              await m.reactions.removeAll();
              m = await m.edit({embed});
            } else u.clean(m);
          } while (reacted);
        } catch(e) { u.errorHandler(e, "LFG Reload Error"); }
      } else {
        // List *all* games played
        let games = new u.Collection();
        for (const [memberId, member] of members) {
          if (member.user.bot) continue;
          let game = member.presence.activities.filter(a => a.type == "PLAYING")[0];
          if (game && !games.has(game.name)) games.set(game.name, {game: game.name, players: 0});
          if (game) games.get(game.name).players++;
        }

        let gameList = games
        .filter(g => g.players > 1)
        .sort((a, b) => {
          if (b.players == a.players) return a.game.localeCompare(b.game);
          else return b.players - a.players
        }).array();

        let embed = u.embed()
        .setTitle("Currently played games in " + msg.guild.name)
        .setDescription(`The top ${Math.min(gameList.length, 25)} games currently being played in ${msg.guild.name} (with more than one player):`)
        .setTimestamp();

        if (gameList.length > 0) {
          for (let i = 0; i < Math.min(gameList.length, 25); i++) {
            embed.addField(gameList[i].game, gameList[i].players, true);
          }
        } else embed.setDescription("Well, this is awkward ... I couldn't find any games with more than one member playing.");

        u.botSpam(msg).send({embed});
      }
    } catch(e) {
      u.errorHandler(e, msg);
    }
  },
  permissions: (msg) => msg.guild
})
.addEvent("loadConfig", async () => {
  try {
    let rows = await Module.config.sheets.get("WIP Channel Defaults").getRows();
    gameDefaults.clear();
    for (let row of rows)
      gameDefaults.set(row["ChannelId"], row["Game Name"]);
  } catch(error) { u.errorHandler(error, "LFG loadConfig"); }
});

module.exports = Module;
