const Augur = require("augurbot"),
  fs = require("fs"),
  Mixer = require("beam-client-node"),
  TwitchClient = require("twitch").default,
  twitchConfig = require("../config/twitch.json"),
  u = require("../utils/utils"),
  yaml = require("js-yaml");

var yt, applicationCount = 0;

const mixer = new Mixer.Client(new Mixer.DefaultRequestRunner()),
  mixerStatus = new Map(),
  twitch = TwitchClient.withClientCredentials(twitchConfig.clientId, twitchConfig.clientSecret).helix,
  twitchGames = new Map(),
  twitchStatus = new Map(),
  ytStatus = new Map(),
  bonusStreams = require("../data/streams.json");

function checkStreams(bot) {
  try {
    // Approved Streamers
    let streamers = bot.guilds.get(Module.config.ldsg).roles.get("267038468474011650").members;

    Module.db.ign.getList("twitch").then(igns => {
      igns.filter(ign => streamers.has(ign.discordId))
      .concat(bonusStreams.twitch.map(c => ({ign: c, discordId: c})))
      .forEach(ign => {
        let channelName = encodeURIComponent(ign.ign);
        processTwitch(bot, ign.discordId, channelName);
      });
    });

    Module.db.ign.getList("mixer").then(igns => {
      igns.filter(ign => streamers.has(ign.discordId))
      .concat(bonusStreams.mixer.map(c => ({ign: c, discordId: c})))
      .forEach(ign => {
        let channelName = encodeURIComponent(ign.ign);
        processMixer(bot, ign.discordId, channelName);
      });
    });

    // Check for new Approved Streamers applications
    processApplications();

  } catch(e) { u.alertError(e, "Stream Check"); }
};

function isPartnered(member) {
  let roles = [
    //'507031155627786250', // Extra Life
    '121783798647095297', // Onyx Sponsor
    '121783903630524419', // Pro Sponsor
    '96345401078087680' // Staff
  ];

  let partnered = roles.reduce((p, role) => (p || member.roles.has(role)), (member.id == member.client.user.id));
  return partnered;
};

function mixerEmbed(res) {
  let embed = u.embed()
    .setColor('#0078d7')
    .setTitle("Mixer Stream: " + res.token)
    .setAuthor(res.token, res.user.avatarUrl)
    .setURL(`https://mixer.com/${res.token}`)
    .setTimestamp();

  if (res.online) {
    embed.setDescription(res.name)
      .setThumbnail(res.type.coverUrl)
      .addField("Playing", res.type.name, true)
      .addField("Current Viewers", res.viewersCurrent, true);
  } else {
    embed.setDescription("Currently Offline")
      .setThumbnail(res.user.avatarUrl)
      .addField("Followers", res.numFollowers)
  }
  return embed;
};

function notificationEmbed(body, srv) {
  let embed = u.embed()
    .setTimestamp();
  if (srv == "twitch") {
    let data = body._data;
    let channel = body.stream.channel;
    embed.setColor('#6441A4')
      .setThumbnail(data.thumbnail_url.replace("{width}", "480").replace("{height}", "270"))
      .setTitle(data.user_name)
      .setAuthor(data.user_name + (twitchGames.has(data.game_id) ? ` playing ${twitchGames.get(data.game_id).name}` : ""))
      .setURL(data.stream_url);
  } else if (srv == "mixer") {
    embed.setColor('#0078d7')
      .setThumbnail(body.type.coverUrl)
      .setTitle(body.name)
      .setAuthor(body.user.username + ((body.type && body.type.name) ? ` playing ${body.type.name}` : ""), body.user.avatarUrl)
      .setURL(`https://mixer.com/${body.token}`);
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

        Module.handler.client.channels.get("146289578674749440")
          .send(embed)
          .then(() => fs.unlink(path))
          .catch(e => u.alertError(e, "Delete Approved Streamer Application Error"));
      }
    });
  } catch(e) { u.alertError(e, "Streaming Application Check"); }
}

async function processMixer(bot, key, channel) {
  try {
    let ldsg = bot.guilds.get(Module.config.ldsg),
      liveRole = ldsg.roles.get("281135201407467520"),
      notificationChannel = ldsg.channels.get(Module.config.ldsg), // #general
      member = ldsg.members.get(key);
    let res = await mixer.request("GET", `channels/${channel}`);
    res = res.body;

    if (res.online) { // STREAM IS LIVE
      let status = mixerStatus.get(key);
      if (!status || ((status.status == "offline") && ((Date.now() - status.since) >= (30 * 60 * 1000)))) {
        mixerStatus.set(key, {
          status: "online",
          since: Date.now()
        });
        if (!(res.audience == "18+") && !(res.audience == "mature")) {
          notificationChannel.send(notificationEmbed(res, "mixer"));
          if (member && isPartnered(member)) member.addRole(liveRole);
        }
      }
    } else if (mixerStatus.has(key) && (mixerStatus.get(key).status == "online")) { // STREAM IS OFFLINE
      mixerStatus.set(key, {
        status: "offline",
        since: Date.now()
      });
      if (member && liveRole.members.has(member.id)) member.removeRole(liveRole);
    }
  } catch(e) {
    u.alertError(e, "Process Mixer");
  }
};

async function processTwitch(bot, key, channel) {
  try {
    let ldsg = bot.guilds.get(Module.config.ldsg),
      liveRole = ldsg.roles.get("281135201407467520"),
      notificationChannel = ldsg.channels.get(Module.config.ldsg), // #general
      member = ldsg.members.get(key);

    const stream = await twitch.streams.getStreamByUserName(channel);
    if (stream) {
      if (!twitchGames.has(stream._data.game_id)) {
        let game = (await twitch.games.getByGameId(stream._data.game_id)).data;
        twitchGames.set(game.id, game);
      }
      let status = twitchStatus.get(key);
      stream._data.stream_url = "https://www.twitch.tv/" + encodeURIComponent(channel).toLowerCase();
      if (!status || ((status.status == "offline") && ((Date.now() - status.since) >= (30 * 60 * 1000)))) {
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
      }
      if (member && isPartnered(member)) member.addRole(liveRole);
      notificationChannel.send(notificationEmbed(stream, "twitch"));
    } else if (twitchStatus.has(key) && (twitchStatus.get(key).status == "online")) {
      if (channel.toLowerCase() == "ldsgamers") bot.user.setGame("");
      if (member && liveRole.members.has(member.id)) member.removeRole(liveRole);

      twitchStatus.set(key, {
        status: "offline",
        since: Date.now()
      });
    }
  } catch(e) {
    u.alertError(e, "Process Twitch");
  }
};

async function processYouTube(bot, key, channel) {
  try {
    let ldsg = bot.guilds.get(Module.config.ldsg),
      liveRole = ldsg.roles.get("281135201407467520"),
      notificationChannel = ldsg.channels.get("209046676781006849"), // #general
      member = ldsg.members.get(key);

    let info = await yt.fetchUserContent(channel, "live");

    if (info && info.content.length > 0) { // STREAM IS LIVE
      let status = ytStatus.get(key);
      if (!status || ((status.status == "offline") && ((Date.now() - status.since) >= (30 * 60 * 1000)))) {
        ytStatus.set(key, {
          status: "online",
          since: Date.now()
        });

        notificationChannel.send(notificationEmbed(info, "youtube"));
        if (isPartnered(member)) member.addRole(liveRole);
      }
    } else if (ytStatus.has(key) && (ytStatus.get(key).status == "online")) { // STREAM IS OFFLINE
      ytStatus.set(key, {
        status: "offline",
        since: Date.now()
      });
      if (liveRole.members.has(member.id)) member.removeRole(liveRole);
    }
  } catch(e) {
    u.alertError(e, "Process YouTube");
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
    .setThumbnail(data.thumbnail_url.replace("{width}", "480").replace("{height}", "270"))
    .addField("Playing", (data.game_id ? twitchGames.get(data.game_id).name : "Nothing"))
    .addField("Current Viewers", data.viewer_count)
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
.addCommand({name: "approve",
  description: "Approve an LDSG Streamer",
  syntax: "@user(s)",
  category: "Streaming",
  process: (msg) => {
    u.clean(msg);
    let bot = msg.client;

    if (u.userMentions(msg)) {
      msg.react("👌");
      u.userMentions(msg).forEach(user => {
        let member = bot.guilds.get(Module.config.ldsg).members.get(user.id);
        member.addRole("267038468474011650").then((streamer) => {
          streamer.send("Congratulations! You've been added to the Approved Streamers list in LDSG!\n\nWhile streaming, please remember the Streaming Guidelines ( https://goo.gl/Pm3mwS ) and LDSG Code of Conduct ( http://ldsgamers.com/code-of-conduct ). Also, please be aware that LDSG may make changes to the Approved Streamers list from time to time at its discretion.");
          msg.reply("I applied the role to " + streamer.displayName + "!").then(u.clean);
          bot.channels.get("506575671242260490").send(`ℹ️ ${(msg.member ? msg.member.displayName : msg.author.username)} has made ${streamer.displayName} an Approved Streamer.`);
        });
      });
    } else msg.reply("you need to tell me who to approve!").then(u.clean);
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.has(Module.config.roles.team))
})
.addCommand({name: "mixer",
  description: "Links to a Mixer stream",
  syntax: "<mixerChannel> | <@user>",
  category: "Streaming",
  process: async function(msg, suffix) {
    try {
      let user = false,
      name = false;

      if (u.userMentions(msg)) user = u.userMentions(msg).first();
      else if (!suffix) user = msg.author;

      if (user) {
        let ign = await Module.db.ign.find(user.id, "mixer");
        if (ign) name = encodeURIComponent(ign.ign);
        else {
          msg.channel.send(user + " has not set a Mixer name with `!addign mixer`.").then(u.clean);
          return;
        }
      } else name = encodeURIComponent(suffix);

      let res = await mixer.request("GET", `channels/${name}`);
      res = res.body;
      if (res.statusCode && (res.statusCode == 404)) {
        msg.channel.send("I couldn't find a Mixer channel for " + decodeURIname(name)).then(u.clean);
      } else {
        msg.channel.send(mixerEmbed(res));
      }
    } catch(e) {
      u.alertError(e, msg);
    }
  }
})
.addCommand({name: "multitwitch",
  desription: "Links to multi-stream pages on Multistre.am",
  syntax: "@user(s) stream(s)",
  category: "Streaming",
  aliases: ["multi", "multistream", "ms"],
  process: async (msg, suffix) => {
    if (suffix) {
      let list = suffix.replace(/<@!?\d+>/g, "")
      if (msg.mentions.users.size > 0) {
        let mentions = msg.mentions.users.map(u => u.id);
        let igns = (await Module.db.ign.find(mentions, "twitch")).map(ign => ign.ign);
        list += " " + igns.join(" ");
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

    if (suffix && quitter.includes(suffix)) {
      msg.delete();
      msg.reply("ok ... I guess. :cry:").then(u.clean);
      msg.member.removeRole(raider);
      bot.channels.get("506575671242260490").send(`ℹ️ ${msg.member.displayName} is no longer a Twitch Raider. :cry:`);
    } else {
      let ldsg = bot.emojis.get("447251297033256962"); // Hex logo

      msg.member.addRole(raider);
      msg.reply("thanks for being a Twitch Raider! " + ldsg);

      bot.channels.get("506575671242260490").send(`ℹ️ ${msg.member.displayName} has become a Twitch Raider!`);
    }
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == "96335850576556032"))
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
  process: (msg) => {
    let name = "ldsgamers";

    twitch.getChannelStream(name, function(error, body) {
      if (error) {
        if (error.status == 404)
          msg.channel.send("I couldn't find a Twitch channel for " + name).then(u.clean);
        else console.error(error);
      } else if (body.stream) {
        msg.channel.send(twitchEmbed(body));
      } else {
        twitch.getChannel(name, function(error, body) {
          if (error && error.status == 404) {
            msg.channel.send("I couldn't find a Twitch channel for " + name).then(u.clean);
          } else if (error) {
            console.error(error);
          } else {
            msg.channel.send(twitchEmbed(body));
          }
        });
      }
    });
  }
})
.addCommand({name: "streaming",
  description: "Who in the server is streaming right now?",
  category: "Streaming",
  process: async function (msg) {
    try {
      let twitchIgns = await Module.db.ign.getList("twitch");
      let mixerIgns = await Module.db.ign.getList("mixer");

      let twitchChannels = twitchIgns.filter(ign => msg.guild.members.has(ign.discordId)).map(ign => ign.ign);
      let mixerChannels = mixerIgns.filter(ign => msg.guild.members.has(ign.discordId)).map(ign => ign.ign);

      // Fetch channels from Twitch and Mixer
      let res = await Promise.all([
        new Promise((fulfill, reject) => {
          twitch.getStreams({
            channel: twitchChannels.join(",")
          }, (error, body) => {
            if (error) reject(error);
            else fulfill({service: "twitch", channels: body.streams});
          });
        }),
        new Promise((fulfill, reject) => {
          mixer.request("GET", `channels?where=token:in:${mixerChannels.join(";")}`)
          .then(res => {
            fulfill({service: "mixer", channels: res.body});
          })
          .catch(reject);
        })
      ]);

      let embed = u.embed()
      .setColor('#325CBD')
      .setTimestamp()
      .setTitle("Currently Streaming in " + msg.guild.name);

      let channels = [];
      res.forEach(service => {
        if (service.service == "twitch") {
          service.channels.forEach(stream => {
            let channel = stream.channel;
            if (channel)
            channels.push({
              name: channel.display_name,
              game: channel.game,
              service: "Twitch",
              title: channel.status,
              url: channel.url
            });
          });
        } else if (service.service == "mixer") {
          service.channels.forEach(stream => {
            channels.push({
              name: stream.token,
              game: stream.type.name,
              service: "Mixer",
              title: stream.name,
              url: `https://mixer.com/${stream.token}`
            });
          });
        }
      });

      channels.sort((a, b) => a.name.localeCompare(b.name)).forEach(channel => {
        embed.addField(`${channel.name} playing ${channel.game} [${channel.service}]`, `[${channel.title}](${channel.url})`, true);
      });

      u.botSpam(msg).send(embed);

    } catch (e) {
      u.alertError(e, msg);
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

      if (u.userMentions(msg)) {
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
            let game = (await twitch.games.getGameById(stream._data.game_id))._data;
            twitchGames.set(game.id, game);
          }
          stream._data.stream_url = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase();
          msg.channel.send(twitchEmbed(stream));
        } else { // Offline
          const streamer = (await twitch.users.getUserByName(name));
          streamer._data.stream_url = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase();
          msg.channel.send(twitchEmbed(streamer, false));
        }
      } catch(e) {
        // msg.channel.send("I couldn't find a Twitch channel for " + decodeURIComponent(name)).then(u.clean);
        u.alertError(e, msg);
      }
    } catch(e) {
      u.alertError(e, msg);
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
  process: (msg) => {
    u.clean(msg);
    if (u.userMentions(msg)) {
      msg.react("")
      u.userMentions(msg).forEach(user => {
        let member = msg.guild.members.get(user.id);
        member.removeRole("267038468474011650").then((streamer) => {
          streamer.send("You've been removed from the Approved Streamers list in LDSG.");
          msg.react("👌");
          bot.channels.get("506575671242260490").send(`ℹ️ ${(msg.member ? msg.member.displayName : msg.author.username)} has removed ${streamer.displayName} from Approved Streamers.`);
        });
      });
    } else {
      msg.reply("you need to tell me who to unapprove!").then(u.clean);
    }
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.has(Module.config.roles.team))
})
.addCommand({name: "watchchannel",
  description: "Add a non-member's channel to notifications.",
  syntax: "twitch/mixer channel",
  category: "Streaming",
  permissions: (msg) => (msg.guild && msg.guild.id == Module.config.ldsg && msg.member.roles.has(Module.config.roles.management)),
  process: (msg, suffix) => {
    try {
      suffix = suffix.toLowerCase().split(" ");
      let platform = suffix.shift();
      if (["mixer", "twitch"].includes(platform)) {
        bonusStreams[platform] = bonusStreams[platform].concat(suffix);
        msg.react("👌");
        fs.writeFileSync("./data/streams.json", JSON.stringify(bonusStreams, null, "\t"));
        u.clean(msg);
      } else return msg.reply("you need to tell me a platform (twitch/mixer) and at least one channel to watch!").then(u.clean);
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "unwatchchannel",
  description: "remove a non-member's channel to notifications.",
  syntax: "twitch/mixer channel",
  category: "Streaming",
  permissions: (msg) => (msg.guild && msg.guild.id == Module.config.ldsg && msg.member.roles.has(Module.config.roles.management)),
  process: (msg, suffix) => {
    try {
      suffix = suffix.toLowerCase().split(" ");
      let platform = suffix.shift();
      if (["mixer", "twitch"].includes(platform)) {
        bonusStreams[platform] = bonusStreams[platform].filter(s => !suffix.includes(s.toLowerCase()));
        msg.react("👌");
        fs.writeFileSync("./data/streams.json", JSON.stringify(bonusStreams, null, "\t"));
        u.clean(msg);
      } else return msg.reply("you need to tell me a platform (twitch/mixer) and at least one channel to unwatch!").then(u.clean);
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "youtube",
  description: "Show a user's recent videos",
  syntax: "<youtube user name> | <@user>",
  aliases: ["yt"],
  info: "Displays user videos and stream info.",
  category: "Streaming",
  process: async function(msg, suffix) {
    try {
      let user = false,
        name = false;

      if (u.userMentions(msg)) {
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
        msg.channel.send({embed: embed});
      } else {
        msg.channel.send(`I couldn't find channel info for YouTube user \`${name}\``).then(u.clean);
      }
    } catch(e) { u.alertError(e, msg); }
  }
})
.addEvent("guildMemberUpdate", (oldMember, newMember) => {
  let twitchSub = "338056125062578176";
  if (oldMember.roles.has(twitchSub) && !newMember.roles.has(twitchSub)) {
    newMember.send("It looks like your Twitch subscription to LDS Gamers has expired!\n\nTwitch Prime subscriptions need to be resubbed on a monthly basis. If this was unintentional, please consider resubbing at <https://www.twitch.tv/ldsgamers>. It helps keep the website and various game servers running. Thanks for the support! <:hexlogo:447251297033256962>").catch(u.ignoreError);
    newMember.client.channels.get("506575671242260490").send(`**${newMember.displayName}**'s Twitch Sub has expired!`);
  } else if (!oldMember.roles.has(twitchSub) && newMember.roles.has(twitchSub)) {
    newMember.send("Thanks for becoming an LDS Gamers Twitch Subscriber! People like you help keep the website and various game servers running. If you subscribed with a Twitch Prime sub, those need to be renewed monthly. You'll get a notification if I notice it lapse. Thanks for the support! <:hexlogo:447251297033256962>").catch(u.ignoreError);
    newMember.client.channels.get("506575671242260490").send(`**${newMember.displayName}** has become a Twitch Sub!`);
  }
})
.setInit((data) => {
  yt = require("../utils/youtube")(Module.config.api.youtube);

  if (data) {
    data.mixerStatus.forEach((status, key) => mixerStatus.set(key, status));
    data.twitchStatus.forEach((status, key) => twitchStatus.set(key, status));
    data.ytStatus.forEach((status, key) => ytStatus.set(key, status));
  }
})
.setUnload(() => ({ mixerStatus, twitchStatus, ytStatus, applicationCount }))
.setClockwork(() => {
  try {
    let bot = Module.handler.client;
    let interval = 5 * 60 * 1000;
    checkStreams(bot);
    return setInterval(checkStreams, interval, bot);
  } catch(e) { u.alertError(e, "Streaming Clockwork"); }
});

module.exports = Module;
