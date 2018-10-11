const u = require("../utils/utils"),
  Augur = require("augurbot"),
  profanityFilter = require("profanity-matcher"),
  request = require("request"),
  ytdl = require("ytdl-core");

const availableNames = [
	"Room Buttermelon",
  "Room Slothmare",
  "Room Handicorn",
  "Room Manahands",
  "Room Toxipandankery",
  "Room Cornmuffin",
  "Room Shenanigans",
  "Room Fancypants",
  "Room Thunderpaws",
  "Room Barley",
  "Room Fry Sauce",
  "Room Goat",
  "Room Ink",
	"Room Potato",
  "Room Trogdor",
],
queue = new Map();

async function playSound(guildId) {
  try {
    let guildQueue = queue.get(guildId);
    if (guildQueue && guildQueue.length > 0) {
      let {channel, sound} = guildQueue.shift();

      let voiceConnection = channel.guild.voiceConnection;

      if (voiceConnection && (voiceConnection.channel.id != channel.id)) {
        await voiceConnection.disconnect();
        voiceConnection = await channel.join();
      } else if (!voiceConnection) {
        voiceConnection = await channel.join();
      }

      let dispatcher = voiceConnection.playStream(sound);

      dispatcher.on("end", (reason) => {
        if (guildQueue.length == 0) {
          voiceConnection.disconnect();
        } else {
          playSound(guildId);
        }
      });
    }
  } catch(e) {
    u.alertError(e);
  }
}

const Module = new Augur.Module()
.addCommand({name: "lock",
  syntax: "[@additionalUser(s)]",
  description: "Locks your current voice channel to new users",
  category: "Voice",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voiceChannel && availableNames.includes(msg.member.voiceChannel.name)),
  process: (msg) => {
  	let channel = msg.member.voiceChannel;
  	if (channel && availableNames.includes(channel.name)) {
  		let users = Array.from(channel.members.values()).concat(Array.from(msg.mentions.members.values()));
      users.push(msg.client.user);

  		let channelMods = [];
  		let muted = Module.config.roles.muted;

  		channelMods.push(channel.overwritePermissions(msg.guild.id, {CONNECT: false}));

  		channel.permissionOverwrites.forEach(permission => {
  			if ((permission.id != muted) && (permission.id != msg.guild.id) && !users.map(u => u.id).includes(permission.id)) channelMods.push(permission.delete());
  		});

  		users.forEach(user => {
  			channelMods.push(channel.overwritePermissions(user, {CONNECT: true}));
  		});

  		Promise.all(channelMods).then(() => {
  			msg.channel.send(`${channel.name} locked to all users except ${users.filter(u => u.id !== msg.client.user.id).map(u => u.displayName).join(", ")}`);
  		});
  	} else {
  		msg.reply("you need to be in a community voice channel to use this command!").then(u.clean);
  	}
  }
})
.addCommand({name: "song",
  aliases: ["yt"],
  description: "Play a YouTube Song",
  hidden: true,
  syntax: "<YouTube URL>",
  category: "Voice",
  permissions: (msg) => (msg.guild && ((msg.guild.id == "136569499859025920") || ((msg.guild.id == "136569499859025920") || ((msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.team) || msg.member.roles.has("114816596341424129")))) && msg.member.voiceChannel)),
  process: async function(msg, song) {
    try {
      if (song.startsWith("<") && song.endsWith(">")) song = song.substr(1, song.length - 2);

      if (ytdl.validateURL(song)) {
        let info = await ytdl.getBasicInfo(song);
        if (!queue.has(msg.guild.id)) queue.set(msg.guild.id, []);

        msg.channel.send(`Queueing ${info.title}...`);
        let guildQueue = queue.get(msg.guild.id);
        guildQueue.push({channel: msg.member.voiceChannel, sound: ytdl(song, {filter: "audioonly"})});
        if (!(msg.guild.voiceConnection && msg.guild.voiceConnection.dispatcher)) playSound(msg.guild.id);

      } else msg.reply(`\`${suffix}\` isn't a valid YouTube URL.`);
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
  }
})
.addCommand({name: "sound",
  syntax: "<search>",
  aliases: ["sb", "soundboard"],
  description: "Plays a sound",
  info: "Plays a matched sound from Freesound.org",
  category: "Voice",
  permissions: (msg) => (msg.guild && ((msg.guild.id == "136569499859025920") || ((msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.team) || msg.member.roles.has("114816596341424129")))) && msg.member.voiceChannel),
  process: (msg, suffix) => {
    if (suffix) {
      let pf = new profanityFilter();
      if (pf.scan(suffix.toLowerCase()).length == 0) {
        let url = `https://freesound.org/apiv2/search/text/?query=${suffix}&fields=name,id,duration,previews,tags,description&filter=duration:[* TO 10]&token=${Module.config.api.freesound}`;
        request(url, async function(err, response, body) {
          try {
            if (!err && response.statusCode == 200) {
              body = JSON.parse(body);
              let sound = null;

              while (!sound && (body.results.length > 0)) {
                sound = body.results[Math.floor(Math.random() * body.results.length)];
                if ((pf.scan(sound.tags.join(" ")).length > 0) || (pf.scan(sound.description).length > 0)) {
                  body.results = body.results.filter(r => r.id != sound.id);
                  sound = null;
                }
              }

              if (sound) {
                if (!queue.has(msg.guild.id)) queue.set(msg.guild.id, []);
                let guildQueue = queue.get(msg.guild.id);

                guildQueue.push({channel: msg.member.voiceChannel, sound: sound.previews["preview-lq-mp3"]});
                if (!(msg.guild.voiceConnection && msg.guild.voiceConnection.dispatcher)) playSound(msg.guild.id);

              } else msg.reply("I couldn't find any sounds for " + suffix);
            } else u.alertError(err, msg);
          } catch(e) {
            Module.handler.errorHandler(e, msg);
          }
        });
      } else msg.reply("I'm not going to make that sound.").then(u.clean);
    }
  }
})
.addCommand({name: "unlock",
	description: "Unlocks your current voice channel for new users",
  category: "Voice",
  hidden: true,
	permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voiceChannel && availableNames.includes(msg.member.voiceChannel.name)),
	process: (msg) => {
		let channel = msg.member.voiceChannel;
		if (channel && availableNames.includes(channel.name)) {
			let channelMods = [];
			let muted = Module.config.roles.muted;
			channelMods.push(channel.overwritePermissions(msg.guild.id, {CONNECT: null}));
			channel.permissionOverwrites.forEach(permission => {
				if ((permission.id != muted) && (permission.id != msg.guild.id)) channelMods.push(permission.delete());
			});

			Promise.all(channelMods).then(() => {
				msg.channel.send(`${channel.name} is now open to all users.`);
			});
		} else {
			msg.reply("you need to be in a community voice channel to use this command!").then(u.clean);
		}
	}
})
.addEvent("voiceStateUpdate", (oldMember, newMember) => {
  if ((oldMember.guild.id == Module.config.ldsg) && (oldMember.voiceChannelID != newMember.voiceChannelID)) {
    if (oldMember.voiceChannel && (oldMember.voiceChannel.members.size == 0) && availableNames.includes(oldMember.voiceChannel.name)) {
      // REMOVE OLD VOICE CHANNEL
      oldMember.voiceChannel.delete().catch(console.error);
    }
    if (newMember.voiceChannelID && (newMember.voiceChannel.members.size == 1) && availableNames.includes(newMember.voiceChannel.name)) {
      // CREATE NEW VOICE CHANNEL
      let name = "";
      for (var i = 0; (i < availableNames.length && !name); i++) {
        if (!newMember.guild.channels.find(c => c.name == availableNames[i])) name = availableNames[i];
      }
      if (!name) name = availableNames[0];
      newMember.guild.createChannel(name, "voice").then(channel => {
        channel.setParent("363014069533540362");
      });
    }
  }
});

module.exports = Module;
