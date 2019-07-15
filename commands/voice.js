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
  "Room Potat",
  "Room Trogdor",
];

const communityVoice = "363014069533540362";
const isCommunityVoice = (channel) => ((channel.parentID == communityVoice) && (channel.name != "AFK"));

var queue;

async function playSound(guildId) {
  try {
    let guildQueue = queue.get(guildId).queue;
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
    u.alertError(e, "Voice playSound() error");
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

      Promise.all(channelMods).then(() => msg.react("🔒"));
    } else {
      msg.reply("you need to be in a community voice channel to use this command!").then(u.clean);
    }
  }
})
.addCommand({name: "silent",
  description: "Stop playing songs and sounds",
  hidden: true,
  category: "Voice",
  permissions: (msg) => (msg.guild && msg.guild.voiceConnection && msg.guild.voiceConnection.dispatcher && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: async function(msg) {
    try {
      let guildQueue = queue.get(msg.guild.id).queue;
      guildQueue = [];
      msg.guild.voiceConnection.dispatcher.end();
      msg.react("🔇");
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "skip",
  description: "Skip the current song",
  hidden: true, aliases: ["next"],
  category: "Voice",
  permissions: (msg) => (msg.guild && msg.guild.voiceConnection && msg.guild.voiceConnection.dispatcher && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: async function(msg) {
    try {
      await msg.guild.voiceConnection.dispatcher.end();
      msg.react("⏩");
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "song",
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
        if (!queue.has(msg.guild.id)) queue.set(msg.guild.id, {queue: [], nonce: null});
        let guildQueue = queue.get(msg.guild.id);

        if (msg.nonce != guildQueue.nonce) { // Prevent double-queueing due to embed updates
          guildQueue.queue.push({channel: msg.member.voiceChannel, sound: ytdl(song, {filter: "audioonly"})});
          guildQueue.nonce = msg.nonce;
          msg.channel.send(`Queueing ${info.title}...`);
          if (!(msg.guild.voiceConnection && msg.guild.voiceConnection.dispatcher)) playSound(msg.guild.id);
        }
      } else msg.reply(`\`${song}\` isn't a valid YouTube URL.`);
    } catch(e) {
      u.alertError(e, msg);
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
                if (!queue.has(msg.guild.id)) queue.set(msg.guild.id, {queue: [], nonce: null});
                let guildQueue = queue.get(msg.guild.id).queue;

                guildQueue.push({channel: msg.member.voiceChannel, sound: sound.previews["preview-lq-mp3"]});
                if (!(msg.guild.voiceConnection && msg.guild.voiceConnection.dispatcher)) playSound(msg.guild.id);

              } else msg.reply("I couldn't find any sounds for " + suffix);
            } else u.alertError(err, msg);
          } catch(e) {
            u.alertError(e, msg);
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

      Promise.all(channelMods).then(() => msg.react("🔓"));
    } else {
      msg.reply("you need to be in a community voice channel to use this command!").then(u.clean);
    }
  }
})
.addCommand({name: "voicecleanup",
  description: "Removes extra voice channels",
  category: "Voice",
  permissions: (msg) => (msg.guild && msg.guild.id == Module.config.ldsg && msg.member.roles.has(Module.config.roles.mod)),
  process: (msg) => {
    let channels = msg.guild.channels
      .filter(c => c.parentID == "363014069533540362" && c.type == "voice" && availableNames.includes(c.name) && c.members.size == 0);
    if (channels.size > 2) {
      let del = channels.first(channels.size - 2);
      del.forEach(async channel => await channel.delete("Too many channels"));
    }
    msg.react("👌");
  }
})
.setInit(data => queue = (data ? data : new Map()))
.setUnload(() => queue)
.addEvent("voiceStateUpdate", async (oldMember, newMember) => {
  let guild = oldMember.guild;
  if ((guild.id == Module.config.ldsg) && (oldMember.voiceChannelID != newMember.voiceChannelID)) {
    if (oldMember.voiceChannel && (oldMember.voiceChannel.members.size == 0) && isCommunityVoice(oldMember.voiceChannel)) {
      // REMOVE OLD VOICE CHANNEL
      oldMember.voiceChannel.delete().catch(e => u.alertError(e, "Could not delete empty voice channel."));
    }
    if (newMember.voiceChannelID && (newMember.voiceChannel.members.size == 1) && isCommunityVoice(newMember.voiceChannel)) {
      // CREATE NEW VOICE CHANNEL
      const bitrate = newMember.voiceChannel.bitrate;
      let name = "";
      for (var i = 0; (i < availableNames.length && !name); i++) {
        if (!guild.channels.find(c => c.name.startsWith(availableNames[i]))) {
          name = `${availableNames[i]} (${bitrate} kbps)`;
          break;
        }
      }
      if (!name) name = `${availableNames[0]} (${bitrate} kbps)`;
      try {
        await guild.createChannel(name, {
          type: "voice",
          bitrate,
          parent: communityVoice
        }, [{
          id: Module.config.roles.muted,
          deny: ["VIEW_CHANNEL", "CONNECT", "SEND_MESSAGES", "SPEAK"]
        }]);
      } catch(e) { u.alertError(e, "Voice message creation error."); }
    }
  }
});

module.exports = Module;
