const Augur = require("augurbot");
/*,
  DubAPI = require("dubapi"),
  WebhookClient = require("discord.js").WebhookClient,
  config = require("../config/dubtrack.json"),
  u = require("../utils/utils");

const icarus = new WebhookClient(config.id, config.token);

var dubReady = false,
  dubBot = null,
  nowPlaying = null;

const Module = new Augur.Module()
.addEvent("message", (msg) => {
  if ((msg.channel.id == config.music) && (!msg.author.id != msg.client.user.id) && (msg.author.id != config.id) && dubReady) {
    // POST TO DUBTRACK
    try {
      dubBot.sendChat(`*${msg.member.displayName}*: ${msg.cleanContent}`);
    } catch(e) {
      console.error(e);
    }
  }
})
.setInit((lastPlaying) => {
  if (lastPlaying) nowPlaying = lastPlaying;
  dubBot = new DubAPI({username: config.user, password: config.pass}, function(err, bot) {
    if (err) return console.error(err);

    console.log('Running DubAPI v' + bot.version);

    bot.on('connected', function(name) {
      console.log('Connected to Dubtrack Room ' + name);
      dubReady = true;
    });

    bot.on('disconnected', function(name) {
      if (dubReady) {
        dubReady = false;
        console.log('Disconnected from Dubtrack Room ' + name);
        setTimeout(bot.connect, 15000);
      }
    });

    bot.on('error', function(err) {
      console.error(err);
    });

    bot.on(bot.events.chatMessage, function(data) {
      if (data.user && data.user.username && icarus && (data.user.username != "LDSG_Icarus")) {
        let message = `**${data.user.username}:** ${data.message}`
        icarus.send(message).catch(console.error);
      }
    });

    bot.on(bot.events.roomPlaylistUpdate, function(song) {
      if (icarus && song.raw && song.raw.songInfo && (song.raw.songInfo.name != nowPlaying)) {
        nowPlaying = song.raw.songInfo.name;
      	let embed = u.embed()
          .setAuthor("Dubtrack.fm")
          .setColor(0xeb008b)
          .setURL("https://www.dubtrack.fm/join/lds-gamers")
          .setTitle("Now Playing on Dubtrack.fm")
          .setDescription(song.raw.songInfo.name)
          .setThumbnail(song.raw.songInfo.images.thumbnail)
          .setTimestamp();

        icarus.send("", embed).catch(console.error);
      }
    });

    bot.connect(config.url);
  });
})
.setUnload(() => {
  dubReady = false;
  dubBot.disconnect();
  return nowPlaying;
});
*/
module.exports = new Augur.Module();
