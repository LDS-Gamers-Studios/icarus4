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
function isCommunityVoice(channel) {
  return ((channel.parentID == communityVoice) && (channel.id != "123477839696625664"));
}

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

  async awaitControls(m) {
    try {
      let press;
      while ((press = await m.awaitReactions((reaction, user) => !user.bot && buttons.includes(reaction.emoji.name), {max: 1, time: this.current.length})) && this.pl.id == m.id) {
        press = press.first();
        if (press.emoji.name == "⏹️") {
          this.stop();
        } else if (press.emoji.name == "⏯️") {
          if (this.dispatcher && this.dispatcher.paused) this.resume();
          else this.pause();
        } else if (press.emoji.name == "⏭️") {
          this.skip();
        }
        for (const [id, user] of press.users.cache)
          if (id != m.client.user.id) press.remove(user).catch(u.noop);
      }
    } catch(error) { u.errorHandler(error, "Playlist Controls"); }
  }

  connection(guildResolvable) {
    let client = Module.client;
    let guildId;
    if (guildResolvable.guild) guildId = guildResolvable.guild.id;
    else if (guildResolvable.id) guildId = guildResolvable.id;
    else guildId = guildResolvable;
    return client.voice.connections.get(guildId);
  }

  pause(t = 0) {
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
        let voiceConnection = ((channel.guild.voice && channel.guild.voice.connection) ? channel.guild.voice.connection : null);
        if (voiceConnection && voiceConnection.channel.id != channel.id) {
          await voiceConnection.disconnect();
          voiceConnection = await channel.join();
        } else if (!voiceConnection) {
          voiceConnection = await channel.join();
        }

        let stream = (sound.type == "yt" ? ytdl(sound.link, {filter: "audioonly"}) : sound.link);
        let dispatcher = voiceConnection.play(stream);
        this.dispatcher = dispatcher;
        this.playlist();
        dispatcher.on("error", (error) => {
          dispatcher.end();
        });
        dispatcher.on("end", (reason) => {
          if (!this.queue) {
            if (!this.sticky) voiceConnection.disconnect();
            if (this.pl) this.playlist();
            delete this.dispatcher;
            delete this.current;
          } else this.play();
        });
      } catch(error) {
        u.errorHandler(error, `Sound playback in ${channel.guild.name}`);
        this.stop();
      }
      this.current = sound;
    }
    return this;
  }

  async playlist(msg) {
    try {
      if (this.current) {
        let list = [this.current];
        let next = this.queue;
        let later = {count: 0, duration: 0};
        let i = 0;
        while (next && i++ < 5) {
          list.push(next.value.sound);
          next = next.after;
        }
        while (next) {
          later.count++;
          later.duration += next.value.sound.length;
          next = next.after;
        }
        let embed = u.embed().setTimestamp()
        .setTitle("Current Playlist")
        .setDescription(
          list.map((song, i) => `${(i == 0 ? "▶️ " : "")}(${Math.floor(song.length / 3600)}:${(Math.floor(song.length / 60) % 60).toString().padStart(2, "0")}:${(song.length % 60).toString().padStart(2, "0")}) ${song.title}`).join("\n")
          + (later.count ? `\n${later.count} more songs... (${Math.floor(later.duration / 3600)}:${(Math.floor(later.duration / 60) % 60).toString().padStart(2, "0")}:${(later.duration % 60).toString().padStart(2, "0")})` : "")
        );
        if (msg) {
          let m = await msg.channel.send({embed});
          if (this.pl && !this.pl.deleted) {
            this.pl.edit({embed: u.embed().setTimestamp().setTitle("Current Playlist").setURL(m.url).setDescription(`Active playlist has been moved to ${m.url}`)});
            this.pl.clearReactions().catch(u.noop);
          }
          this.pl = m;
          let buttons = ["⏹️", "⏯️", "⏭️"];
          for (const button of buttons) await m.react(button);
          this.awaitControls(m);
        } else if (this.pl && !this.pl.deleted) {
          let m = await this.pl.edit({embed});
          this.awaitControls(m);
        }
      } else {
        if (msg) msg.channel.send("There are no songs currently playing in this server.").then(u.clean);
        if (this.pl && !this.pl.deleted) this.pl.edit({embed: u.embed().setTimestamp().setTitle("Current Playlist").setDescription("No songs are currently playing.")});
      }
    } catch(error) { u.errorHandler(error, "Playlist Update"); }
  }

  resume() {
    if (this.dispatcher) this.dispatcher.resume();
    return this;
  }

  skip() {
    if (this.dispatcher) this.dispatcher.end();
    if (!this.queue) this.playlist();
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
    this.playlist();
    return this;
  }
}

const queues = new Map();

const Module = new Augur.Module()
.addCommand({name: "join",
  description: "Make the bot join voice chat.",
  permission: msg => msg.member && msg.member.voice && msg.member.voice.channel,
  process: async (msg) => {
    try {
      const connection = await msg.member.voice.channel.join();
      if (!queues.has(msg.guild.id)) queues.set(msg.guild.id, new Queue(connection));
      queues.get(msg.guild.id).stick(true);
      msg.react("👌");
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "leave",
  description: "Make the bot leave voice chat.",
  permissions: msg => msg.guild,
  process: async (msg) => {
    try {
      const queue = queues.get(msg.guild.id);
      if (queue) {
        queue.stick(false);
        if (queue.connection) queue.connection.disconnect();
        queues.delete(msg.guild.id);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "lock",
  syntax: "[@additionalUser(s)]",
  description: "Locks your current voice channel to new users",
  category: "Voice",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voice.channel && isCommunityVoice(msg.member.voice.channel)),
  process: async (msg) => {
    try {
      const channel = msg.member.voice.channel;
      const users = (Array.from(channel.members.keys())).concat(Array.from(msg.mentions.users.keys()));

      let overwrites = [
        { // bot
          id: msg.client.user.id,
          allow: "CONNECT"
        }, { // @everyone
          id: msg.guild.id,
          deny: "CONNECT"
        }, { // Muted
          id: Module.config.roles.muted,
          deny: ["CONNECT", "SPEAK"]
        }
      ].concat(users.map(u => ({
        id: u.id,
        allow: "CONNECT"
      })));

      await channel.overwritePermissions(overwrites);
      await msg.react("🔒");
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "playlist",
  permissions: (msg) => msg.guild,
  aliases: ["pl"],
  syntax: "[skip/stop/pause/resume]",
  process: async (msg, suffix) => {
    try {
      suffix = suffix.toLowerCase();
      if (queues.has(msg.guild.id)) {
        let pl = queues.get(msg.guild.id);
        if (suffix == "skip" || suffix == "next") {
          pl.skip();
          msg.react("⏭️");
        } else if (suffix == "stop") {
          pl.stop();
          msg.react("⏹️");
        } else if (suffix == "pause" || suffix == "resume" || suffix == "unpause") {
          if (pl.connection.dispatcher && pl.connection.dispatcher.paused) pl.resume();
          else pl.pause();
          msg.react("⏯️");
        } else if (!suffix) {
          pl.playlist(msg);
        } else {
          msg.reply("I don't know what that means.").then(u.clean);
        }
      } else msg.reply("There is no current playlist for this server.").then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "song",
  description: "Play a song or playlist from YouTube",
  syntax: "<link>",
  permissions: (msg) => (msg.guild && msg.member.voice.channel && ((msg.guild.id != Module.config.ldsg) || msg.member.roles.cache.has(Module.config.roles.team) || msg.member.roles.cache.has("114816596341424129"))),
  process: async (msg, suffix) => {
    if (suffix.startsWith("<") && suffix.endsWith(">")) suffix = suffix.substr(1, suffix.length - 2);
    if (ytpl.validateURL(suffix)) {
      try {
        let items = await ytpl(suffix);
        if (items.items && items.items.length > 0) {
          if (!queues.has(msg.guild.id)) queues.set(msg.guild.id, new Queue());
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
            let channel = msg.member.voice.channel;
            queues.get(msg.guild.id).add(channel, sound);
          }
          msg.react("👌");
        } else msg.reply("I couldn't find any songs on that playlist.").then(u.clean);
      } catch(error) { u.errorHandler(error, msg); }
    } else if (ytdl.validateURL(suffix)) {
      try {
        let info = await ytdl.getBasicInfo(suffix);
        let sound = {
          title: info.player_response.videoDetails.title,
          link: suffix,
          type: "yt",
          length: parseInt(info.player_response.videoDetails.lengthSeconds, 10)
        };
        let channel = msg.member.voice.channel;
        if (!queues.has(msg.guild.id)) queues.set(msg.guild.id, new Queue());
        queues.get(msg.guild.id).add(channel, sound);
        msg.react("👌");
      } catch(error) { u.errorHandler(error, msg); }
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
  permissions: (msg) => (msg.guild && msg.member.voice.channel && ((msg.guild.id != Module.config.ldsg) || msg.member.roles.cache.has(Module.config.roles.team) || msg.member.roles.cache.has("114816596341424129"))),
  process: async (msg, suffix) => {
    if (suffix) {
      let pf = new profanityFilter();
      if (pf.scan(suffix.toLowerCase()).length == 0) {
        try {
          let url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(suffix)}&fields=name,id,duration,previews,tags,description&filter=duration:[* TO 10]&token=${Module.config.api.freesound}`;
          let sounds = (JSON.parse(await request(url))).results;
          let sound = null;

          while (!sound && (sounds.length > 0)) {
            sound = u.rand(sounds);
            if ((pf.scan(sound.tags.join(" ")).length > 0) || (pf.scan(sound.description).length > 0)) {
              sounds = sounds.filter(r => r.id != sound.id);
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
            let channel = msg.member.voice.channel;
            if (!queues.has(msg.guild.id)) queues.set(msg.guild.id, new Queue());
            queues.get(msg.guild.id).add(channel, sound);
          } else msg.reply("I couldn't find any sounds for " + suffix);
        } catch(error) { u.errorHandler(error, msg); }
      } else msg.reply("I'm not going to make that sound.").then(u.clean);
    } else msg.reply("you need to give me a sound to search for!").then(u.clean);
  }
})
.addCommand({name: "unlock",
  description: "Unlocks your current voice channel for new users",
  category: "Voice",
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voice.channel && isCommunityVoice(msg.member.voice.channel)),
  process: async (msg) => {
    try {
      const channel = msg.member.voice.channel;

      let overwrites = [
        { // bot
          id: msg.client.user.id,
          allow: "CONNECT"
        }, { // @everyone
          id: msg.guild.id,
          allow: "CONNECT"
        }, { // Muted
          id: Module.config.roles.muted,
          deny: ["CONNECT", "SPEAK"]
        }
      ];

      await channel.overwritePermissions(overwrites);
      await msg.react("🔓");
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.setInit((data) => {
  if (data) for (const [key, value] of data) queues.set(key, value);
})
.setUnload(() => {
  let active = new Map();
  for (const [key, value] of queues) {
    if (value.current) active.set(key, value);
  }
  return active;
})
.addEvent("loadConfig", () => {
  let ldsg = Module.client.guilds.get(Module.config.ldsg);
  Module.config.sheets.get("Voice Channel Names").getRows((e, rows) => {
    if (e) u.errorHandler(e, "Error loading voice channel names.");
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
  if ((guild.id == Module.config.ldsg) && (oldMember.voice.channelID != newMember.voice.channelID)) {
    if (oldMember.voice.channel && (oldMember.voice.channel.members.size == 0) && isCommunityVoice(oldMember.voice.channel)) {
      // REMOVE OLD VOICE CHANNEL
      let oldChannelName = oldMember.voice.channel.name;
      await oldMember.voice.channel.delete().catch(e => u.errorHandler(e, "Could not delete empty voice channel."));
      let name = roomList.find(room => oldChannelName.startsWith(room));
      if (name && !guild.channels.find(c => c.name.startsWith(name))) availableNames.add(name);
    }
    if (newMember.voice.channelID && (newMember.voice.channel.members.size == 1) && isCommunityVoice(newMember.voice.channel)) {
      // CREATE NEW VOICE CHANNEL
      const bitrate = newMember.voice.channel.bitrate;

      let name = (availableNames.size > 0 ? availableNames.random() : u.rand(roomList));
      availableNames.delete(name);
      name += ` (${bitrate} kbps)`;

      try {
        await guild.channels.create(name, {
          type: "voice",
          bitrate: bitrate * 1000,
          parent: communityVoice,
          permissionOverwrites: [{
            id: Module.config.roles.muted,
            deny: ["VIEW_CHANNEL", "CONNECT", "SEND_MESSAGES", "SPEAK"]
          }]
        });
      } catch(e) { u.errorHandler(e, "Voice message creation error."); }
    }
  }
});

module.exports = Module;
