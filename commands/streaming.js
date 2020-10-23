const Augur = require("augurbot"),
  fs = require("fs"),
  TwitchClient = require("twitch").default,
  twitchConfig = require("../config/twitch.json"),
  u = require("../utils/utils"),
  yaml = require("js-yaml");

const extraLife = false;

var applicationCount = 0;

const twitch = TwitchClient.withClientCredentials(twitchConfig.clientId, twitchConfig.clientSecret).helix,
  twitchGames = new Map(),
  twitchStatus = new Map(),
  bonusStreams = require("../data/streams.json");

async function checkStreams(bot) {
  try {
    // Approved Streamers
    let streamers = bot.guilds.cache.get(Module.config.ldsg).roles.cache.get("267038468474011650").members.map(member => member.id);

    let igns = await Module.db.ign.find(streamers, "twitch");

    igns = igns.concat(bonusStreams.twitch.map(c => ({ign: c, discordId: c})));
    for (const ign of igns) {
      let channelName = encodeURIComponent(ign.ign);
      processTwitch(bot, ign.discordId, channelName);
    }

    // Check for new Approved Streamers applications
    processApplications();

    // Check for Extra Life
    if (extraLife && (new Date()).getMinutes() < 5) {
      const liveEL = bot.guilds.cache.get(Module.config.ldsg).roles.cache.get("281135201407467520").members.filter(m => m.roles.cache.has("507031155627786250"));
      if (liveEL.size > 0) extraLifeEmbed(bot, liveEL);
    }
  } catch(e) { u.errorHandler(e, "Stream Check"); }
};

async function extraLifeEmbed(bot, liveEL) {
  try {
    let twitchIgns = await Module.db.ign.find(liveEL.map(m => m.id), "twitch");

    let twitchChannels = twitchIgns.map(ign => ign.ign);

    // Fetch channels from Twitch
    let res = await Promise.all([
      new Promise(async (fulfill, reject) => {
        try {
          let streams = await twitch.streams.getStreams({userName: twitchChannels.filter((v, i) => i < 100)});
          fulfill({service: "twitch", channels: streams.data});
        } catch(e) { u.errorHandler(e, msg); }
      })
    ]);

    let embed = u.embed()
    .setColor('#7FD836')
    .setTimestamp()
    .setTitle("Live from the Extra Life Team!");

    let channels = [];
    for (const service of res) {
      if (service.service == "twitch") {
        for (const stream of service.channels) {
          let channel = stream._data;
          if (channel)
            channels.push({
              name: channel.user_name,
              game: twitchGames.has(channel.game_id) ? twitchGames.get(channel.game_id).name : "Something?",
              service: "Twitch",
              title: channel.title,
              url: `https://www.twitch.tv/${channel.user_name}`
            });
        }
      }
    }

    channels.sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < Math.min(channels, 25); i++) {
      let channel = channel[i];
      embed.addField(`${channel.name} playing ${channel.game} [${channel.service}]`, `[${channel.title}](${channel.url})`, true);
    }

    bot.channels.cache.get(Module.config.ldsg).send({embed});
  } catch (e) {
    u.errorHandler(e, msg);
  }
};

function isPartnered(member) {
  let roles = [
    '121783798647095297', // Onyx Sponsor
    '121783903630524419', // Pro Sponsor
    '96345401078087680' // Staff
  ];
  if (extraLife) roles.push("507031155627786250");

  if (member.id == member.client.user.id) return true;
  for (let role of roles) {
    if (member.roles.cache.has(role)) return true;
  }
  return false;
};

function notificationEmbed(body, srv = "twitch") {
  let embed = u.embed()
    .setTimestamp();
  if (srv == "twitch") {
    let data = body._data;
    embed.setColor('#6441A4')
      .setThumbnail(data.thumbnail_url.replace("{width}", "480").replace("{height}", "270") + "?t=" + Date.now())
      .setTitle(data.user_name)
      .setAuthor(data.user_name + (twitchGames.has(data.game_id) ? ` playing ${twitchGames.get(data.game_id).name}` : ""))
      .setURL(data.stream_url);
  } else if (srv == "youtube") {
    let content = body.content[0].snippet;
    embed.setColor("#ff0000")
      .setThumbnail(content.thumbnails.default.url)
      .setTitle(content.title)
      .setAuthor(content.channelTitle)
      .setURL(`https://www.youtube.com/watch?v=${body.content[0].id.videoId}`);
  }
  return embed;
};

function processApplications() {
  try {
    let applications = fs.readdirSync(Module.config.streamApplications);

    applications.forEach(application => {
      if (application.endsWith(".yaml")) {
        let path = `${Module.config.streamApplications}/${application}`;
        let app = yaml.safeLoad(fs.readFileSync(path, "utf8"));
        app.timestamp = new Date(fs.statSync(path).mtime);

        let embed = u.embed()
          .setTitle("New Approved Streamer Application")
          .setAuthor(app.name)
          .setColor('#325CBD')
          .setTimestamp(new Date(app.timestamp))
          .addField("Discord Username", app.name)
          .addField("Streaming Platforms", app.streamed_platforms.join("\n"))
          .addField("Streaming Games", app.streamed_games)
          .addField("Stream Links", app.streaming_platform_links)
          .addField("Discord Commitment", app.discord_commit)
          .addField("Code Commitment", app.agree_to_conduct);

        Module.client.channels.cache.get("146289578674749440")
          .send({embed})
          .then(() => fs.unlinkSync(path))
          .catch(e => u.errorHandler(e, "Delete Approved Streamer Application Error"));
      }
    });
  } catch(e) { u.errorHandler(e, "Streaming Application Check"); }
}

async function processTwitch(bot, key, channel) {
  try {
    let ldsg = bot.guilds.cache.get(Module.config.ldsg),
      liveRole = ldsg.roles.cache.get("281135201407467520"),
      notificationChannel = ldsg.channels.cache.get(Module.config.ldsg), // #general
      member = ldsg.members.cache.get(key);

    const stream = await twitch.streams.getStreamByUserName(channel);
    if (stream) {
      let status = twitchStatus.get(key);
      if (!status || ((status.status == "offline") && ((Date.now() - status.since) >= (30 * 60 * 1000)))) {
        if (!twitchGames.has(stream._data.game_id)) {
          let game = await twitch.games.getGameById(stream._data.game_id);
          if (game) twitchGames.set(game.id, game._data);
        }
        stream._data.stream_url = "https://www.twitch.tv/" + encodeURIComponent(channel).toLowerCase();
        if (channel.toLowerCase() == "ldsgamers") {
          bot.user.setActivity(
            stream._data.title,
            {
              url: stream._data.stream_url,
              type: "STREAMING"
            }
          );
        }
        twitchStatus.set(key, {
          status: "online",
          since: Date.now()
        });
        if (member && isPartnered(member)) member.roles.add(liveRole);
        let embed = notificationEmbed(stream, "twitch");

        // The real notifications
        if (extraLife && member.roles.cache.has("507031155627786250") && stream._data.title.toLowerCase().includes("extra life"))
          notificationChannel.send(`${ldsg.roles.cache.get("768164394248044575")}, **${member.displayName}** is live for Extra Life!`, {embed});
        else
          notificationChannel.send({embed});
      }
    } else if (twitchStatus.has(key) && (twitchStatus.get(key).status == "online")) {
      if (channel.toLowerCase() == "ldsgamers") bot.user.setActivity("Tiddlywinks");
      if (member && liveRole.members.has(member.id)) member.roles.remove(liveRole);

      twitchStatus.set(key, {
        status: "offline",
        since: Date.now()
      });
    }
  } catch(e) {
    u.errorHandler(e, "Process Twitch");
  }
};

function twitchEmbed(stream, online = true) {
  const data = stream._data;
  const name = data.user_name || data.display_name;
  const embed = u.embed()
    .setURL(data.stream_url)
    .setAuthor(name)
    .setTitle("Twitch Stream: " + name)
    .setColor('#6441A4');

  if (online) {
    embed.setDescription(data.title)
    .setTitle(data.user_name)
    .setThumbnail(data.thumbnail_url.replace("{width}", "480").replace("{height}", "270") + "?t=" + Date.now())
    .addField("Playing", (data.game_id && twitchGames.has(data.game_id) ? twitchGames.get(data.game_id).name : "Something"), true)
    .addField("Current Viewers", data.viewer_count, true)
    .setTimestamp(new Date(data.started_at));
  } else {
    embed.setDescription("**Currently Offline**\n" + data.description)
    .setTitle(data.display_name)
    .setThumbnail(data.profile_image_url)
    .setTimestamp();
  }

  return embed;
};

function youtubeEmbed(info) {
  let embed = u.embed()
    .setColor(0xff0000)
    .setTimestamp()
    .setTitle("YouTube Channel: " + info.channel.snippet.title)
    .setDescription(info.channel.snippet.description)
    .setURL("https://www.youtube.com/" + (info.channel.snippet.customUrl ? info.channel.snippet.customUrl : `channel/${info.channel.id}`))
    .setThumbnail(info.channel.snippet.thumbnails.default.url)
    .setAuthor(info.channel.snippet.title, info.channel.snippet.thumbnails.default.url);

  info.content.forEach(vid => embed.addField("Video", `[${vid.snippet.title}](https://www.youtube.com/watch?v=${vid.id.videoId})`, true));

  return embed;
}

const Module = new Augur.Module()
.addCommand({name: "astreamer",
  description: "Approve an LDSG Streamer for notifications",
  syntax: "@user(s)",
  category: "Streaming",
  process: async (msg) => {
    u.clean(msg);
    let bot = msg.client;

    if (u.userMentions(msg, true).size > 0) {
      msg.react("👌");
      for (const [id, member] of u.userMentions(msg, true)) {
        try {
          if (member.roles.cache.has(Module.config.roles.trusted)) {
            let streamer = await member.roles.add("267038468474011650");
            streamer.send("Congratulations! You've been added to the Approved Streamers list in LDSG! This allows notifications to show up in #general and grants access to stream to voice channels. In order to show notifications in #general, please make sure your correct Twitch or Mixer name is saved in the database with `!addIGN twitch/mixer YourName`.\n\nWhile streaming, please remember the Streaming Guidelines ( https://goo.gl/Pm3mwS ) and LDSG Code of Conduct ( http://ldsgamers.com/code-of-conduct ). Also, please be aware that LDSG may make changes to the Approved Streamers list from time to time at its discretion.").catch(u.noop);
            msg.reply("I applied the role to " + streamer.displayName + "!").then(u.clean);
            bot.channels.cache.get("506575671242260490").send(`ℹ️ ${msg.member.displayName} has made ${streamer.displayName} an Approved Streamer.`);
          } else {
            msg.reply(`${member.displayName} needs to be trusted first!`);
          }
        } catch(error) { u.errorHandler(error, msg); }
      }
    } else msg.reply("you need to tell me who to approve!").then(u.clean);
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.cache.has(Module.config.roles.team))
})
.addCommand({name: "cstreamer",
  description: "Approve an LDSG Streamer for community streaming",
  syntax: "@user(s)",
  category: "Streaming",
  process: async (msg) => {
    u.clean(msg);
    let bot = msg.client;

    if (u.userMentions(msg, true).size > 0) {
      msg.react("👌");
      for (const [id, member] of u.userMentions(msg, true)) {
        try {
          if (member.roles.cache.has(Module.config.roles.trusted)) {
            let streamer = await member.roles.add("698291753308127265");
            streamer.send("Congratulations! You've been added to the Community Streamers list in LDSG, allowing you to stream to voice channels!\n\nWhile streaming, please remember the Streaming Guidelines ( https://goo.gl/Pm3mwS ) and LDSG Code of Conduct ( http://ldsgamers.com/code-of-conduct ). Also, please be aware that LDSG may make changes to the Community Streamers list from time to time at its discretion.").catch(u.noop);
            msg.reply("I applied the role to " + streamer.displayName + "!").then(u.clean);
            bot.channels.cache.get("506575671242260490").send(`ℹ️ ${msg.member.displayName} has made ${streamer.displayName} a Community Streamer.`);
          } else {
            msg.reply(`${member.displayName} needs to be trusted first!`);
          }
        } catch(error) { u.errorHandler(error, msg); }
      }
    } else msg.reply("you need to tell me who to approve!").then(u.clean);
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.cache.has(Module.config.roles.team))
})
.addCommand({name: "multitwitch",
  desription: "Links to multi-stream pages on Multistre.am",
  syntax: "@user(s) stream(s)",
  category: "Streaming",
  aliases: ["multi", "multistream", "ms"],
  process: async (msg, suffix) => {
    if (suffix) {
      let list = suffix.replace(/<@!?\d+>/g, "").trim();

      if (msg.mentions.users.size > 0) {
        try {
          let mentions = msg.mentions.users.map(u => u.id);
          let igns = (await Module.db.ign.find(mentions, "twitch")).map(ign => ign.ign);
          list += " " + igns.join(" ");
        } catch(error) { u.errorHandler(error, msg); }
      }
      list = list.trim().replace(/ +/g, "/");
      msg.channel.send(`View the Multistre.am for ${list.replace(/\//g, ", ")} here:\nhttps://multistre.am/${list}`);
    } else msg.reply("you need to tell me which streams to watch!").then(u.clean);
  }
})
.addCommand({name: "raider",
  description: "Show your support for LDSG on Twitch!",
  info: "Assigns you the Twitch Raiders role, showing your support for LDSG Streaming.",
  aliases: ["raiders", "twitchraider", "twitchraiders"],
  category: "Streaming",
  process: (msg, suffix) => {
    let bot = msg.client;
    let quitter = ["done", "off", "false", "remove", "quit", "no"];
    let raider = "309889486521892865";

    if (suffix && quitter.includes(suffix.toLowerCase())) {
      msg.delete();
      msg.reply("ok ... I guess. :cry:").then(u.clean);
      msg.member.roles.remove(raider);
      bot.channels.cache.get("506575671242260490").send(`ℹ️ ${msg.member.displayName} is no longer a Twitch Raider. :cry:`);
    } else {
      let ttv = bot.emojis.cache.get("491332611340369920"); // ldsg

      msg.member.roles.add(raider);
      msg.reply("thanks for being a Twitch Raider! " + ttv.toString());

      bot.channels.cache.get("506575671242260490").send(`ℹ️ ${msg.member.displayName} has become a Twitch Raider!`);
    }
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg))
})
.addCommand({name: "schedule",
  description: "Check the LDSG streaming schedule",
  category: "Streaming",
  process: (msg) => msg.channel.send("**LDSG Streaming Schedule:**\nhttp://ldsgamers.com/community/streaming-schedule")
})
.addCommand({name: "stream",
  description: "Watch the LDSG Twitch stream",
  info: "Displays LDSG stream status and stream info.",
  category: "Streaming",
  process: async (msg) => {
    let name = "ldsgamers";

    try {
      const stream = (await twitch.streams.getStreamByUserName(name));
      if (stream) {
        if (!twitchGames.has(stream._data.game_id)) {
          let game = (await twitch.games.getGameById(stream._data.game_id));
          if (game) twitchGames.set(game._data.id, game._data);
        }
        stream._data.stream_url = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase();
        msg.channel.send(twitchEmbed(stream));
      } else { // Offline
        const streamer = (await twitch.users.getUserByName(name));
        streamer._data.stream_url = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase();
        msg.channel.send(twitchEmbed(streamer, false));
      }
    } catch(e) {
      u.errorHandler(e, msg);
    }
  }
})
.addCommand({name: "streaming",
  description: "Who in the server is streaming right now?",
  category: "Streaming",
  process: async function (msg) {
    try {
      let twitchIgns = await Module.db.ign.getList("twitch");
      let twitchChannels = twitchIgns.filter(ign => msg.guild.roles.cache.get("267038468474011650").members.has(ign.discordId)).map(ign => ign.ign);

      // Fetch channels from Twitch
      let res = await Promise.all([
        new Promise(async (fulfill, reject) => {
          try {
            let streams = await twitch.streams.getStreams({userName: twitchChannels.slice(0, 100)});
            fulfill({service: "twitch", channels: streams.data});
          } catch(e) { u.errorHandler(e, msg); reject(e); }
        })
      ]);

      let embed = u.embed()
      .setColor('#6441A4')
      .setTimestamp()
      .setTitle("Currently Streaming in " + msg.guild.name);

      let channels = [];
      for (let service of res) {
        if (service.service == "twitch") {
          for (let stream of service.channels) {
            let channel = stream._data;
            if (!channel) continue;
            if (!twitchGames.has(stream._data.game_id)) {
              let game = (await twitch.games.getGameById(stream._data.game_id));
              if (game) twitchGames.set(game._data.id, game._data);
            }
            channels.push({
              name: channel.user_name,
              game: twitchGames.has(channel.game_id) ? twitchGames.get(channel.game_id).name : "Something?",
              service: "Twitch",
              title: channel.title,
              url: `https://www.twitch.tv/${channel.user_name}`
            });
          }
        }
      }

      channels.sort((a, b) => a.name.localeCompare(b.name));
      for (let i = 0; i < Math.min(channels.length, 25); i++) {
        let channel = channels[i];
        embed.addField(`${channel.name} playing ${channel.game} [${channel.service}]`, `[${channel.title}](${channel.url})`, true);
      }

      u.botSpam(msg).send({embed});
    } catch (e) {
      u.errorHandler(e, msg);
    }
  },
  permissions: (msg) => msg.guild
})
.addCommand({name: "twitch",
  description: "Links to a Twitch stream",
  syntax: "<streamer_name> | <@user>",
  info: "Displays stream status and stream info.",
  category: "Streaming",
  process: async function(msg, suffix) {
    try {
      let user = false,
      name = false;

      if (u.userMentions(msg).size > 0) {
        user = u.userMentions(msg).first();
      } else if (!suffix) {
        user = msg.author;
      }

      if (user) {
        let ign = await Module.db.ign.find(user.id, 'twitch');
        if (ign) name = encodeURIComponent(ign.ign);
        else {
          msg.channel.send(user + " has not set a Twitch name with `!addign twitch`.").then(u.clean);
          return;
        }
      } else name = encodeURIComponent(suffix);

      try {
        const stream = (await twitch.streams.getStreamByUserName(name));
        if (stream) {
          if (!twitchGames.has(stream._data.game_id)) {
            let game = (await twitch.games.getGameById(stream._data.game_id));
            if (game) twitchGames.set(game._data.id, game._data);
          }
          stream._data.stream_url = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase();
          msg.channel.send(twitchEmbed(stream));
        } else { // Offline
          const streamer = (await twitch.users.getUserByName(name));
          streamer._data.stream_url = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase();
          msg.channel.send(twitchEmbed(streamer, false));
        }
      } catch(e) {
        u.errorHandler(e, msg);
      }
    } catch(e) {
      u.errorHandler(e, msg);
    }
  }
})
.addCommand({name: "twitchteam",
  description: "See the LDSG Twitch Team Page",
  category: "Streaming",
  process: (msg) => {
    msg.channel.send("Spend some time with the LDSG Twitch Team!\nhttps://www.twitch.tv/team/ldsgamers");
  }
})
.addCommand({name: "unapprove",
  description: "Unapprove an LDSG Streamer",
  syntax: "@user(s)",
  hidden: true,
  category: "Streaming",
  process: async (msg) => {
    try {
      u.clean(msg);
      if (u.userMentions(msg, true).size > 0) {
        for (let [memberId, member] of u.userMentions(msg, true)) {
          let streamer = await member.roles.remove(["267038468474011650", "698291753308127265"]);
          streamer.send("You've been removed from the Approved and/or Community Streamers list in LDSG.");
          msg.guild.channels.cache.get("506575671242260490").send(`ℹ️ ${msg.member.displayName} has removed ${streamer.displayName} from Approved/Community Streamers.`);
        }
        msg.react("👌");
      } else {
        msg.reply("you need to tell me who to unapprove!").then(u.clean);
      }
    } catch(error) { u.errorHandler(error, msg); }
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.cache.has(Module.config.roles.team))
})
.addCommand({name: "watchchannel",
  description: "Add a non-member's channel to notifications.",
  syntax: "channel",
  category: "Streaming",
  permissions: (msg) => (msg.guild && msg.guild.id == Module.config.ldsg && msg.member.roles.cache.has(Module.config.roles.management)),
  process: (msg, suffix) => {
    try {
      suffix = suffix.toLowerCase().split(" ");
      let platform = "twitch";
      if (["twitch"].includes(platform)) {
        bonusStreams[platform] = bonusStreams[platform].concat(suffix);
        msg.react("👌");
        fs.writeFileSync("./data/streams.json", JSON.stringify(bonusStreams, null, "\t"));
        u.clean(msg);
      } else return msg.reply("you need to tell me at least one channel to watch!").then(u.clean);
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "unwatchchannel",
  description: "remove a non-member's channel to notifications.",
  syntax: "twitch channel",
  category: "Streaming",
  permissions: (msg) => (msg.guild && msg.guild.id == Module.config.ldsg && msg.member.roles.cache.has(Module.config.roles.management)),
  process: (msg, suffix) => {
    try {
      suffix = suffix.toLowerCase().split(" ");
      let platform = "twitch";
      if (["twitch"].includes(platform)) {
        bonusStreams[platform] = bonusStreams[platform].filter(s => !suffix.includes(s.toLowerCase()));
        msg.react("👌");
        fs.writeFileSync("./data/streams.json", JSON.stringify(bonusStreams, null, "\t"));
        u.clean(msg);
      } else return msg.reply("you need to tell me at least one channel to unwatch!").then(u.clean);
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "youtube",
  description: "Show a user's recent videos",
  syntax: "<youtube user name> | <@user>",
  aliases: ["yt"],
  info: "Displays user videos and stream info.",
  category: "Streaming",
  enabled: false,
  process: async function(msg, suffix) {
    try {
      let user = false,
        name = false;

      if (u.userMentions(msg).size > 0) {
        user = u.userMentions(msg).first();
      } else if (!suffix) {
        user = msg.author;
      }

      if (user) {
        let ign = await Module.db.ign.find(user.id, "youtube");
        if (ign) name = encodeURIComponent(ign.ign);
        else {
          msg.channel.send(user + " has not set a YouTube name with `!addign youtube`.").then(u.clean);
          return;
        }
      } else name = encodeURIComponent(suffix);

      let info = await yt.fetchUserContent(name);

      if (info) {
        let embed = youtubeEmbed(info);
        msg.channel.send({embed});
      } else {
        msg.channel.send(`I couldn't find channel info for YouTube user \`${name}\``).then(u.clean);
      }
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addEvent("guildMemberUpdate", (oldMember, newMember) => {
  let twitchSub = "338056125062578176";
  if (oldMember.roles.cache.has(twitchSub) && !newMember.roles.cache.has(twitchSub)) {
    newMember.send("It looks like your Twitch subscription to LDS Gamers has expired!\n\nTwitch Prime subscriptions need to be resubbed on a monthly basis. If this was unintentional, please consider resubbing at <https://www.twitch.tv/ldsgamers>. It helps keep the website and various game servers running. Thanks for the support! <:hexlogo:447251297033256962>").catch(u.noop);
    newMember.client.channels.cache.get("506575671242260490").send(`**${newMember.displayName}**'s Twitch Sub has expired!`);
  } else if (!oldMember.roles.cache.has(twitchSub) && newMember.roles.cache.has(twitchSub)) {
    newMember.send("Thanks for becoming an LDS Gamers Twitch Subscriber! People like you help keep the website and various game servers running. If you subscribed with a Twitch Prime sub, those need to be renewed monthly. You'll get a notification if I notice it lapse. Thanks for the support! <:hexlogo:447251297033256962>").catch(u.noop);
    newMember.client.channels.cache.get("506575671242260490").send(`**${newMember.displayName}** has become a Twitch Sub!`);
  }
})
.setInit((data) => {
  if (data) {
    for (const [key, status] of data.twitchStatus) {
      twitchStatus.set(key, status);
    }
  }
})
.setUnload(() => ({ twitchStatus, applicationCount }))
.setClockwork(() => {
  try {
    let bot = Module.client;
    let interval = 5 * 60 * 1000;
    return setInterval(checkStreams, interval, bot);
  } catch(e) { u.errorHandler(e, "Streaming Clockwork"); }
});

module.exports = Module;
