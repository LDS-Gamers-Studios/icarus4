const u = require("../utils/utils"),
  Augur = require("augurbot"),
  profanityFilter = require("profanity-matcher"),
  request = require("request"),
  ytdl = require("ytdl-core"),
  {USet} = require("../utils/tools");

const roomList = [];

const availableNames = new USet();

const communityVoice = "363014069533540362";
const isCommunityVoice = (channel) => ((channel.parentID == communityVoice) && (channel.id != "123477839696625664"));

const queue = new Map();

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
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voiceChannel && isCommunityVoice(msg.member.voiceChannel)),
  process: (msg) => {
    let channel = msg.member.voiceChannel;
    if (channel && isCommunityVoice(channel)) {
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
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voiceChannel && isCommunityVoice(msg.member.voiceChannel)),
  process: (msg) => {
    let channel = msg.member.voiceChannel;
    if (channel && isCommunityVoice(channel)) {
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
      .filter(c => c.parentID == "363014069533540362" && c.type == "voice" && isCommunityVoice(c) && c.members.size == 0);
    if (channels.size > 2) {
      let del = channels.first(channels.size - 2);
      del.forEach(async channel => await channel.delete("Too many channels"));
    }
    msg.react("👌");
  }
})
.setInit((data) => {
  if (data) for (const [key, value] of data) queue.set(key, value);

  let ldsg = Module.handler.client.guilds.get(Module.config.ldsg);

  setTimeout(() => {
    Module.config.sheets.get("Voice Channel Names").getRows((e, rows) => {
      if (e) u.alertError(e, "Error loading voice channel names.");
      else {
        for (let i = 0; i < rows.length; i++) {
          roomList.push(rows[i].name);
          if (!ldsg.channels.find(c => c.name.startsWith(rows[i].name))) availableNames.add(rows[i].name);
        }
      }
    });
  }, 3000);
})
.setUnload(() => queue)
.addEvent("voiceStateUpdate", async (oldMember, newMember) => {
  let guild = oldMember.guild;
  if ((guild.id == Module.config.ldsg) && (oldMember.voiceChannelID != newMember.voiceChannelID)) {
    if (oldMember.voiceChannel && (oldMember.voiceChannel.members.size == 0) && isCommunityVoice(oldMember.voiceChannel)) {
      // REMOVE OLD VOICE CHANNEL
      let oldChannelName = oldMember.voiceChannel.name;
      await oldMember.voiceChannel.delete().catch(e => u.alertError(e, "Could not delete empty voice channel."));
      let name = roomList.find(room => oldChannelName.startsWith(room));
      if (name && !guild.channels.find(c => c.name.startsWith(name))) availableNames.add(name);
    }
    if (newMember.voiceChannelID && (newMember.voiceChannel.members.size == 1) && isCommunityVoice(newMember.voiceChannel)) {
      // CREATE NEW VOICE CHANNEL
      const bitrate = newMember.voiceChannel.bitrate;

      let name = (availableNames.size > 0 ? availableNames.random() : roomList[Math.floor(Math.random() * roomList.length)]);
      availableNames.delete(name);
      name += ` (${bitrate} kbps)`;

      try {
        await guild.createChannel(name, {
          type: "voice",
          bitrate: bitrate * 1000,
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
