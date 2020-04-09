const u = require("../utils/utils"),
  Augur = require("augurbot"),
  profanityFilter = require("profanity-matcher"),
  request = require("request-promise-native"),
  ytpl = require("ytpl"),
  ytdl = require("ytdl-core-discord"),
  {USet, Link} = require("../utils/tools");

const roomList = [];

const availableNames = new USet();

const communityVoice = "363014069533540362";
const isCommunityVoice = (channel) => ((channel.parentID == communityVoice) && (channel.id != "123477839696625664"));

class Queue {
  constructor() {
    this.queue = null;
  }

  add(channel, sound) {
    if (this.queue) this.queue.last.addAfter({channel, sound});
    else this.queue = new Link({channel, sound});
    if (!this.current) this.play();
    return this;
  }

  pause(t) {
    if (this.dispatcher) this.dispatcher.pause();
    if (t) setTimeout(this.resume, t);
    return this;
  }

  async play() {
      if (this.queue) {
        let {channel, sound} = this.queue.value;
        try {
          this.queue = this.queue.remove();
          this.current = sound;
          let voiceConnection = channel.guild.voiceConnection;

          if (voiceConnection && voiceConnection.channel.id != channel.id) {
            await voiceConnection.disconnect();
            voiceConnection = await channel.join();
          } else if (!voiceConnection) {
            voiceConnection = await channel.join();
          }

          let dispatcher;
          if (sound.type == "yt") {
            dispatcher = voiceConnection.playOpusStream(await ytdl(sound.link));
          } else {
            dispatcher = voiceConnection.playStream(sound.link);
          }
          this.dispatcher = dispatcher;
          this.playlist();
          dispatcher.on("end", (reason) => {
            if (!this.queue) {
              if (!this.sticky) voiceConnection.disconnect();
              if (this.pl) this.playlist();
              delete this.dispatcher;
              delete this.current;
            }
            else this.play();
          });
      } catch(error) { Module.handler.errorHandler(error, `Sound Playback in ${channel.guild.name}`); }
    }
    return this;
  }

  async playlist(msg) {
    if (this.current) {
      let list = [this.current];
      let next = this.queue;
      let i = 0;
      while (next && i++ < 5) {
        list.push(next.value.sound);
        next = next.after;
      }
      let embed = u.embed().setTimestamp()
      .setTitle("Current Playlist")
      .setDescription(list.map(song => `(${Math.floor(song.length / 3600)}:${(Math.floor(song.length / 60) % 60).toString().padStart(2, "0")}:${(song.length % 60).toString().padStart(2, "0")}) ${song.title}`).join("\n"))
      if (msg) {
        let m = await msg.channel.send({embed});
        if (this.pl) {
          this.pl.edit({embed: u.embed().setTimestamp().setTitle("Current Playlist").setURL(m.url).setDescription(`Active playlist has been moved to ${m.url}`)});
          this.pl.clearReactions().catch(u.noop);
        }
        this.pl = m;
        let buttons = ["⏹️", "⏯️", "⏭️"];
        for (const button of buttons) await m.react(button);
        let press;
        while ((press = await m.awaitReactions((reaction, user) => !user.bot && buttons.includes(reaction.emoji.name), {max: 1})) && this.pl.id == m.id) {
          press = press.first();
          if (press.emoji.name == "⏹️") {
            this.stop();
          } else if (press.emoji.name == "⏯️") {
            if (this.dispatcher && this.dispatcher.paused) this.resume();
            else this.pause();
          } else if (press.emoji.name == "⏭️") {
            this.skip();
          }
          for (const [id, user] of press.users)
            if (id != m.client.user.id) press.remove(user).catch(u.noop);
        }
      } else if (this.pl) {
        this.pl.edit({embed});
      }
    } else {
      if (msg) msg.channel.send("There are no songs currently playing in this server.").then(u.clean);
      if (this.pl) this.pl.edit({embed: u.embed().setTimestamp().setTitle("Current Playlist").setDescription("No songs are currently playing.")});
    }
  }

  resume() {
    if (this.dispatcher) this.dispatcher.resume();
    return this;
  }

  skip() {
    if (this.dispatcher) this.dispatcher.end();
    return this;
  }

  stick(value) {
    this.sticky = value;
    return this;
  }

  stop() {
    if (this.current) this.current = null;
    if (this.queue) this.queue = null;
    if (this.dispatcher) this.dispatcher.end();
    return this;
  }
}

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
.addCommand({name: "join",
  description: "Make the bot join voice chat.",
  permission: msg => msg.guild && msg.member.voiceChannel,
  process: (msg) => {
    msg.member.voiceChannel.join();
    if (!queue.has(msg.guild.id)) queue.set(msg.guild.id, new Queue());
    queue.get(msg.guild.id).stick(true);
    msg.react("👌");
  }
})
.addCommand({name: "leave",
  description: "Make the bot leave voice chat.",
  permissions: msg => msg.guild,
  process: (msg) => {
    if (queue.has(msg.guild.id))
      queue.get(msg.guild.id).stick(false);
    if (msg.guild.voiceConnection)
      msg.guild.voiceConnection.disconnect();
    msg.react("👌");
  }
})
.addCommand({name: "lock",
  syntax: "[@additionalUser(s)]",
  description: "Locks your current voice channel to new users",
  category: "Voice",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voiceChannel && isCommunityVoice(msg.member.voiceChannel)),
  process: async (msg) => {
    let channel = msg.member.voiceChannel;
    if (channel && isCommunityVoice(channel)) {
      let users = [msg.client.user].concat(Array.from(channel.members.values()), Array.from(msg.mentions.members.values()));
      let userIds = users.map(u => u.id);

      let muted = Module.config.roles.muted;

      try {
        for (const [permissionId, permission] of channel.permissionOverwrites)
          if ((permissionId != muted) && (permissionId != msg.guild.id) && !userIds.includes(permissionId)) await permission.delete();

        for (let user of users) await channel.overwritePermissions(user, {CONNECT: true});

        await channel.overwritePermissions(msg.guild.id, {CONNECT: false});
        await msg.react("🔒");
      } catch(e) { u.alertError(e, msg); }
    } else {
      msg.reply("you need to be in a community voice channel to use this command!").then(u.clean);
    }
  }
})
.addCommand({name: "playlist",
  permissions: (msg) => msg.guild,
  aliases: ["pl"],
  syntax: "[skip/stop/pause/resume]",
  process: (msg, suffix) => {
    suffix = suffix.toLowerCase();
    if (queue.has(msg.guild.id)) {
      let pl = queue.get(msg.guild.id);
      if (suffix == "skip" || suffix == "next") {
        pl.skip();
        msg.react("⏭️");
      } else if (suffix == "stop") {
        pl.stop();
        msg.react("⏹️");
      } else if (suffix == "pause" || suffix == "resume" || suffix == "unpause") {
        if (pl.dispatcher && pl.dispatcher.paused) pl.resume();
        else pl.pause();
        msg.react("⏯️");
      } else if (!suffix) {
        pl.playlist(msg);
      } else {
        msg.reply("I don't know what that means.").then(u.clean);
      }
    } else {
      msg.reply("There is no current playlist for this server.").then(u.clean);
    }
  }
})
.addCommand({name: "song",
  description: "Play a song or playlist from YouTube",
  syntax: "<link>",
  permissions: msg => msg.guild && msg.member.voiceChannel,
  process: async (msg, suffix) => {
    if (suffix.startsWith("<") && suffix.endsWith(">")) suffix = suffix.substr(1, suffix.length - 2);
    if (ytpl.validateURL(suffix)) {
      try {
        let items = await ytpl(suffix);
        if (items.items && items.items.length > 0) {
          if (!queue.has(msg.guild.id)) queue.set(msg.guild.id, new Queue());
          for (let song of items.items) {
            let duration = song.duration.split(":").map(n => parseInt(n, 10));
            if (duration.length == 1) duration = duration[0];
            if (duration.length == 2) duration = duration[1] + 60 * duration[0];
            if (duration.length == 3) duration = duration[2] + 60 * duration[1] + 3600 * duration[2];

            let sound = {
              title: song.title,
              link: song.url_simple,
              type: "yt",
              length: duration
            };
            let channel = msg.member.voiceChannel;
            queue.get(msg.guild.id).add(channel, sound);
          }
          msg.react("👌");
        } else msg.reply("I couldn't find any songs on that playlist.").then(u.clean);
      } catch(error) { u.alertError(error, msg); }
    } else if (ytdl.validateURL(suffix)) {
      try {
        let info = await ytdl.getBasicInfo(suffix);
        let sound = {
          title: info.player_response.videoDetails.title,
          link: suffix,
          type: "yt",
          length: parseInt(info.player_response.videoDetails.lengthSeconds, 10)
        };
        let channel = msg.member.voiceChannel;
        if (!queue.has(msg.guild.id)) queue.set(msg.guild.id, new Queue());
        queue.get(msg.guild.id).add(channel, sound);
        msg.react("👌");
      } catch(error) { u.alertError(error, msg); }
    } else {
      msg.reply("that wasn't a valid YouTube link!").then(u.clean);
    }
  }
})
.addCommand({name: "sound",
  syntax: "<search>",
  aliases: ["sb", "soundboard"],
  description: "Plays a sound",
  info: "Plays a matched sound from Freesound.org",
  category: "Voice",
  permissions: (msg) => (msg.guild && msg.member.voiceChannel && ((msg.guild.id != Module.config.ldsg) || msg.member.roles.has(Module.config.roles.team) || msg.member.roles.has("114816596341424129"))),
  process: async (msg, suffix) => {
    if (suffix) {
      let pf = new profanityFilter();
      if (pf.scan(suffix.toLowerCase()).length == 0) {
        try {
          let url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(suffix)}&fields=name,id,duration,previews,tags,description&filter=duration:[* TO 10]&token=${Module.config.api.freesound}`;
          let sounds = (JSON.parse(await request(url))).results;
          let sound = null;

          while (!sound && (sounds.length > 0)) {
            sound = sounds[Math.floor(Math.random() * body.results.length)];
            if ((pf.scan(sound.tags.join(" ")).length > 0) || (pf.scan(sound.description).length > 0)) {
              body.results = body.results.filter(r => r.id != sound.id);
              sound = null;
            }
          }

          if (sound) {
            let effect = {
              title: sound.name,
              link: sound.previews["preview-lq-mp3"],
              type: "playStream",
              length: sound.duration
            };
            let channel = msg.member.voiceChannel;
            if (!queue.has(msg.guild.id)) queue.set(msg.guild.id, new Queue());
            queue.get(msg.guild.id).add(channel, sound);
          } else msg.reply("I couldn't find any sounds for " + suffix);
        } catch(e) {
          u.alertError(e, msg);
        }
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
})
.setUnload(() => queue)
.addEvent("loadConfig", () => {
  let ldsg = Module.handler.client.guilds.get(Module.config.ldsg);
  Module.config.sheets.get("Voice Channel Names").getRows((e, rows) => {
    if (e) u.alertError(e, "Error loading voice channel names.");
    else {
      for (let i = 0; i < rows.length; i++) {
        roomList.push(rows[i].name);
        if (!ldsg.channels.find(c => c.name.startsWith(rows[i].name))) availableNames.add(rows[i].name);
      }
    }
  });
})
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
