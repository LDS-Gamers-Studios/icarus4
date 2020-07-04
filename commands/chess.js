const Augur = require("augurbot");
const chess = new (require("chess-web-api"))({queue: true});
const moment = require("moment");
const u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "chess",
  description: "Get your Chess.com games, using the name saved with `!addIGN`",
  syntax: "[playerName]",
  process: async (msg, suffix) => {
    let name;
    if (u.userMentions(msg)) {
      try {
        name = (await Module.db.ign.find(u.userMentions(msg).first().id, 'chess')).ign;
      } catch(error) { u.alertError(error, msg); }
    } else if (suffix) {
    //if (suffix) {
      name = suffix;
    } else {
      try {
        name = (await Module.db.ign.find(msg.author.id, 'chess')).ign;
      } catch(error) { u.alertError(error, msg); }
    }

    if (name) {
      try {
        let result = await chess.getPlayerCurrentDailyChess(encodeURIComponent(name));
        let games = result.body.games;
        let getPlayer = /https:\/\/api\.chess\.com\/pub\/player\/(.*)$/;
        let embed = u.embed().setTitle(`Current Chess.com Games for ${name}`)
          .setThumbnail("https://openclipart.org/image/800px/svg_to_png/275248/1_REY_Blanco_Pieza-Mural_.png");
        let i = 0;
        for (const game of games) {
          embed.addField(`♙${getPlayer.exec(game.white)[1]} v ♟${getPlayer.exec(game.black)[1]}`, `Current Turn: ${(game.turn == "white" ? "♙" : "♟")}${getPlayer.exec(game[game.turn])[1]}\nMove By: ${moment(game.move_by).format("ddd h:mmA Z")}\n[[link]](${game.url})`, true);
          if (++i == 25) break;
        }
        if (games.length == 0) embed.setDescription(`No active games found for ${name}.`);
        else if (games.length > 25) embed.setDescription(`${name}'s first 25 active games:`);
        else embed.setDescription(`${name}'s active games:`);
        msg.channel.send({embed});
      } catch(error) {
        if (error.message == "Not Found" && error.statusCode == 404) {
          msg.reply(`I couldn't find a profile for \`${name}\`.`);
        } else { u.alertError(error, msg); }
      }
    } else {
      if (u.userMentions(msg)) msg.reply(`${u.userMentions(msg).first().username} hasn't saved a Chess.com IGN!`).then(u.clean);
      else msg.reply("you need to tell me who to search for or set an ign with `!addIGN chess name`.").then(u.clean);
    }
  }
});

module.exports = Module;
