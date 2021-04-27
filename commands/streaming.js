const Augur = require("augurbot"),
  fs = require("fs"),
  request = require("request-promise-native"),
  TwitchClient = require("twitch").default,
  twitchConfig = require("../config/twitch.json"),
  u = require("../utils/utils"),
  yaml = require("js-yaml"),
  gamesDBApi = require("../utils/thegamesdb"),
  gamesDB = new gamesDBApi();

const extraLife = (new Date().getMonth() == 10);

var applicationCount = 0;

const twitch = TwitchClient.withClientCredentials(twitchConfig.clientId, twitchConfig.clientSecret).helix,
  twitchGames = new Map(),
  twitchStatus = new Map(),
  bonusStreams = require("../data/streams.json");

async function gameInfo(gameId) {
  if (!twitchGames.has(gameId)) {
    let game = await twitch.games.getGameById(gameId).catch(u.noop);
    if (game) {
      twitchGames.set(game.id, game);
      let ratings = (await gamesDB.byGameName(game.name, {fields: "rating"}))
        .games?.filter(g => g.game_title.toLowerCase() == game.name.toLowerCase() && g.rating != "Not Rated");
      twitchGames.get(game.id, game).rating = ratings[0]?.rating;
    }
  }
  return twitchGames.get(gameId);
}

async function checkStreams() {
  try {
    // Approved Streamers
    let streamers = Module.client.guilds.cache.get(Module.config.ldsg).roles.cache.get("267038468474011650").members.map(member => member.id);

    let igns = await Module.db.ign.find(streamers, "twitch");

    igns = igns.concat(bonusStreams.twitch.map(c => ({ign: c, discordId: c})));
    processTwitch(igns);

    // Check for new Approved Streamers applications
    processApplications();

    // Check for Extra Life
    if (extraLife && (new Date()).getMinutes() < 5) {
      let embed = await extraLifeEmbed();
      if (embed) Module.client.channels.cache.get(Module.config.ldsg).send({embed});
    }
  } catch(e) { u.errorHandler(e, "Stream Check"); }
};

async function extraLifeEmbed() {
  try {
    let streams = await fetchExtraLifeStreams();

    if (streams && streams.data && streams.data.length > 0) {
      let embed = u.embed()
      .setColor(0x7fd836)
      .setTitle("Live from the Extra Life Team!");

      let channels = [];
      for (const stream of streams.data) {
        let game = await gameInfo(stream.gameId)?.name || "Something?";
        channels.push({
          name: stream.userDisplayName,
          game,
          service: "Twitch",
          title: stream.title,
          url: `https://www.twitch.tv/${stream.userDisplayName}`
        });
      }

      channels.sort((a, b) => a.name.localeCompare(b.name));

      for (let i = 0; i < Math.min(channels.length, 25); i++) {
        let channel = channels[i];
        embed.addField(`${channel.name} playing ${channel.game}`, `[${channel.title}](${channel.url})`);
      }

      return embed;
    }
  } catch(error) { u.errorHandler(error, "Extra Life Stream Fetch"); }
}

async function fetchExtraLifeStreams(team) {
  try {
    if (!team) team = await fetchExtraLifeTeam().catch(u.noop);
    if (!team) return null;
    let userName = team.members.filter(m => m.links.stream).map(member => member.links.stream.replace("https://player.twitch.tv/?channel=", ""))
      .filter(channel => !(channel.includes(" ") || channel.includes("/")));
    let streams = await twitch.streams.getStreams({userName}).catch(u.noop);
    return streams;
  } catch(error) { u.errorHandler(error, "Fetch Extra Life Streams"); }
}

async function fetchExtraLifeTeam() {
  try {
    let team = await request("https://extralife.donordrive.com/api/teams/51868").catch(u.noop);
    if (team) {
      team = JSON.parse(team);
      let members = await request("https://extralife.donordrive.com/api/teams/51868/participants").catch(u.noop);
      if (members) team.members = JSON.parse(members);
    }

    // Check donors while we're at it.
    let donations = await request("https://extralife.donordrive.com/api/teams/51868/donations").catch(u.noop);
    if (donations) {
      donations = JSON.parse(donations);
      const donors = JSON.parse(fs.readFileSync("./data/extraLifeDonors.json", "utf8"));
      const newDonors = new Set();
      for (let donation of donations) {
        if (donation.displayName && !donors.includes(donation.displayName)) newDonors.add(donation.displayName);
      }
      if (newDonors.size > 0) {
        Module.client.users.cache.get(Module.config.ownerId).send(`New Extra Life Donor(s)!\n${[...newDonors].join("\n")}`);
        fs.writeFileSync("./data/extraLifeDonors.json", JSON.stringify(donors.concat([...newDonors])));
      }
    }

    return team;
  } catch(error) { u.errorHandler(error, "Fetch Extra Life Team"); }
}

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

function notificationEmbed(stream, srv = "twitch") {
  let embed = u.embed()
    .setTimestamp();
  if (srv == "twitch") {
    let gameName = twitchGames.get(stream.gameId)?.name;
    embed.setColor('#6441A4')
      .setThumbnail(stream.thumbnailUrl.replace("{width}", "480").replace("{height}", "270") + "?t=" + Date.now())
      .setAuthor(stream.userDisplayName + (gameName ? ` playing ${gameName}` : ""))
      .setTitle(stream.title)
      .setURL(stream.streamUrl);
  } else if (srv == "youtube") {
    let content = stream.content[0].snippet;
    embed.setColor("#ff0000")
      .setThumbnail(content.thumbnails.default.url)
      .setTitle(content.title)
      .setAuthor(content.channelTitle)
      .setURL(`https://www.youtube.com/watch?v=${stream.content[0].id.videoId}`);
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

async function processTwitch(igns) {
  try {
    let ldsg = Module.client.guilds.cache.get(Module.config.ldsg),
      liveRole = ldsg.roles.cache.get("281135201407467520"),
      notificationChannel = ldsg.channels.cache.get(Module.config.ldsg); // #general

    let perPage = 50;
    for (let i = 0; i < igns.length; i += perPage) {
      let streamers = igns.slice(i, i + perPage);

      let streams = await twitch.streams.getStreams({userName: streamers.map(s => s.ign)}).catch(error => { u.errorHandler(error, "Twitch getStreams()"); });
      if (streams) {
        // Handle Live
        for (let stream of streams.data) {
          let status = twitchStatus.get(stream.userDisplayName.toLowerCase());
          if (!status || ((status.status == "offline") && ((Date.now() - status.since) >= (30 * 60 * 1000)))) {
            let rating = (await gameInfo(stream.gameId))?.rating;
            stream.streamUrl = "https://www.twitch.tv/" + encodeURIComponent(stream.userDisplayName);
            if (stream.userDisplayName.toLowerCase() == "ldsgamers") {
              Module.client.user.setActivity(
                stream.title,
                {
                  url: stream.streamUrl,
                  type: "STREAMING"
                }
              ).catch(u.noop);
            }
            twitchStatus.set(stream.userDisplayName.toLowerCase(), {
              status: "online",
              since: Date.now()
            });
            let ign = streamers.find(streamer => streamer.ign.toLowerCase() == stream.userDisplayName.toLowerCase());
            let member = await ldsg.members.fetch(ign.discordId).catch(u.noop);
            if (member && isPartnered(member)) member.roles.add(liveRole).catch(u.noop);
            let embed = notificationEmbed(stream, "twitch");

            if ((rating != "M - Mature 17+") && extraLife && member && member.roles.cache.has("507031155627786250") && (stream.title.toLowerCase().includes("extra life") || stream.title.toLowerCase().includes("extralife"))) {
              notificationChannel.send(`${ldsg.roles.cache.get("768164394248044575")}, **${member.displayName}** is live for Extra Life!`, {embed}).catch(u.noop);
              //ldsg.channels.cache.get("733336823400628275").send({embed});
            } else if (rating != "M - Mature 17+")
              notificationChannel.send({embed}).catch(u.noop);
          }
        }

        // Handle Offline
        let offline = streamers.filter(streamer => !streams.data.find(stream => stream.userDisplayName.toLowerCase() == streamer.ign.toLowerCase()));
        for (let channel of offline) {
          if (channel.ign.toLowerCase() == "ldsgamers") Module.client.user.setActivity("Tiddlywinks").catch(error => u.errorHandler(error, "Clear Icarus streaming status"));
          let member = await ldsg.members.fetch(channel.discordId).catch(u.noop);
          if (member && liveRole.members.has(member.id)) member.roles.remove(liveRole).catch(error => u.errorHandler(error, `Remove Live role from ${member.displayName}`));
          let status = twitchStatus.get(channel.ign.toLowerCase());
          if (status && status.status == "online") {
            twitchStatus.set(channel.ign.toLowerCase(), {
              status: "offline",
              since: Date.now()
            });
          }
        }
      }
    }
  } catch(e) {
    u.errorHandler(e, "Process Twitch");
  }
};

function twitchEmbed(stream, online = true) {
  const name = stream.displayName || stream.userDisplayName;
  const embed = u.embed()
    .setURL(stream.streamUrl)
    .setAuthor(name)
    .setTitle("Twitch Stream: " + name)
    .setColor('#6441A4');

  if (online) {
    let gameName = twitchGames.get(stream.gameId)?.name || "Something";
    embed.setDescription(stream.title)
    .setTitle(stream.userDisplayName)
    .setThumbnail(stream.thumbnailUrl.replace("{width}", "480").replace("{height}", "270") + "?t=" + Date.now())
    .addField("Playing", gameName, true)
    .addField("Current Viewers", stream.viewers, true)
    .setTimestamp(stream.startDate);
  } else {
    embed.setDescription("**Currently Offline**\n" + stream.description)
    .setTitle(stream.displayName)
    .setThumbnail(stream.profilePictureUrl)
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

    if (u.userMentions(msg, true).size > 0) {
      msg.react("👌");
      for (const [id, member] of u.userMentions(msg, true)) {
        try {
          if (member.roles.cache.has(Module.config.roles.trusted)) {
            let streamer = await member.roles.add("267038468474011650");
            streamer.send("Congratulations! You've been added to the Approved Streamers list in LDSG! This allows notifications to show up in #general and grants access to stream to voice channels. In order to show notifications in #general, please make sure your correct Twitch or Mixer name is saved in the database with `!addIGN twitch/mixer YourName`.\n\nWhile streaming, please remember the Streaming Guidelines ( https://goo.gl/Pm3mwS ) and LDSG Code of Conduct ( http://ldsgamers.com/code-of-conduct ). Also, please be aware that LDSG may make changes to the Approved Streamers list from time to time at its discretion.").catch(u.noop);
            msg.reply("I applied the role to " + streamer.displayName + "!").then(u.clean);
            msg.guild.channels.cache.get("506575671242260490").send(`ℹ️ ${msg.member.displayName} has made ${streamer.displayName} an Approved Streamer.`);
          } else {
            msg.reply(`${member.displayName} needs to be trusted first!`);
          }
        } catch(error) { u.errorHandler(error, msg); }
      }
    } else msg.reply("you need to tell me who to approve!").then(u.clean);
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.cache.has(Module.config.roles.team))
})
.addCommand({name: "extralife",
  description: "Check the LDSG Extra Life Goal",
  permissions: msg => msg.guild && msg.guild.id == Module.config.ldsg,
  process: async (msg) => {
    try {
      let team = await fetchExtraLifeTeam();
      if (!team) msg.reply("the Extra Life API seems to be down. Please try again in a bit.").then(u.clean);
      for (let member of team.members) {
        if (member.links.stream) member.twitch = member.links.stream.replace("https://player.twitch.tv/?channel=", "");
        member.streamIsLive = false;
      }
      let streams = await fetchExtraLifeStreams(team).catch(u.noop);
      if (streams) {
        for (const stream of streams.data) {
          let member = team.members.find(m => m.twitch && m.twitch.toLowerCase() == stream.userDisplayName.toLowerCase());
          if (member) {
            member.streamIsLive = true;
            member.stream = stream;
          }
        }
      }
      team.members.sort((a, b) => {
        if (a.streamIsLive != b.streamIsLive) return (b.streamIsLive - a.streamIsLive);
        else if (a.sumDonations != b.sumDonations) return (b.sumDonations - a.sumDonations);
        else return a.displayName.localeCompare(b.displayName)
      });
      let total = 0;
      let embed = u.embed().setColor(0x7fd836);
      for (let i = 0; i < Math.min(team.members.length, 25); i++) {
        let member = team.members[i];
        embed.addField(member.displayName, `$${member.sumDonations} / $${member.fundraisingGoal} (${Math.round(100 * member.sumDonations / member.fundraisingGoal)}%)\n[[Donate]](${member.links.donate})${(member.streamIsLive ? `\n**STREAM NOW LIVE**\n[${member.stream.title}](https://www.twitch.tv/${member.twitch})` : "")}`, true);
        total += member.sumDonations;
      }
      embed.setTitle("LDSG Extra Life Team")
      .setThumbnail("https://assets.donordrive.com/extralife/images/fbLogo.jpg?v=202009241356")
      .setURL("https://www.extra-life.org/index.cfm?fuseaction=donorDrive.participant&participantID=412575#donate")
      .setDescription(`LDSG is raising money for Extra Life! We are currently at $${total} of our team's $${team.fundraisingGoal} goal for 2020. That's ${Math.round(100 * total / team.fundraisingGoal)}% there!\n\nYou can help by donating to one of the Extra Life Team below.`);
      msg.channel.send({embed});
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "extralifestream",
  description: "See who is live on the LDSG Extra Life Team",
  permissions: msg => msg.guild && msg.guild.id == Module.config.ldsg,
  process: async (msg) => {
    try {
      let embed = await extraLifeEmbed();
      if (embed) msg.channel.send({embed});
      else msg.reply("I couldn't find any live LDSG Extra Life Team streams!").then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
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
        await gameInfo(stream.gameId);
        stream.streamUrl = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase();
        msg.channel.send(twitchEmbed(stream));
      } else { // Offline
        const streamer = (await twitch.users.getUserByName(name));
        streamer.streamUrl = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase();
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
      const streamFetch = [];

      // Fetch channels from Twitch
      for (let i = 0; i < twitchChannels.length; i += 100) {
        let userName = twitchChannels.slice(i, i + 100);

        streamFetch.push((async function(userName) {
          let streams = await twitch.streams.getStreams({userName}).catch(u.noop);
          return {service: "twitch", channels: (streams ? streams.data : [])};
        })(userName));
      }

      let res = await Promise.all(streamFetch);

      let embed = u.embed()
      .setColor('#6441A4')
      .setTimestamp()
      .setTitle("Currently Streaming in " + msg.guild.name);

      let channels = [];
      for (let service of res) {
        if (service.service == "twitch") {
          for (let stream of service.channels) {
            let game = (await gameInfo(stream.gameId))?.name || "Something?";
            channels.push({
              name: stream.userDisplayName,
              game,
              service: "Twitch",
              title: stream.title,
              url: `https://www.twitch.tv/${stream.userDisplayName}`
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
    } catch (e) { u.errorHandler(e, msg); }
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
        let ign = await Module.db.ign.find(user.id, 'twitch').catch(u.noop);
        if (ign) name = encodeURIComponent(ign.ign);
        else {
          msg.channel.send(user + " has not set a Twitch name with `!addign twitch`.").then(u.clean);
          return;
        }
      } else if (suffix.includes(" ")) {
        msg.reply(`\`${suffix}\` doesn't appear to be a valid Twitch username!`).then(u.clean);
        return;
      } else {
        name = encodeURIComponent(suffix);
      }

      const stream = await twitch.streams.getStreamByUserName(name).catch(u.noop);
      if (stream) {
        await gameInfo(stream.gameId);
        stream.streamUrl = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase().replace(/[^\w-]+/g,'');
        msg.channel.send(twitchEmbed(stream));
      } else { // Offline
        const streamer = await twitch.users.getUserByName(name).catch(u.noop);
        if (streamer) {
          streamer.streamUrl = "https://www.twitch.tv/" + encodeURIComponent(name).toLowerCase().replace(/[^\w-]+/g,'');
          msg.channel.send(twitchEmbed(streamer, false));
        } else {
          msg.reply(`I couldn't find the channel \`name\`. :shrug:`).then(u.clean);
        }
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
  gamesDB._setKey(Module.config.api.thegamesdb);
  if (data) {
    for (const [key, status] of data.twitchStatus) {
      twitchStatus.set(key, status);
    }
  }
})
.setUnload(() => ({ twitchStatus, applicationCount }))
.setClockwork(() => {
  try {
    let interval = 5 * 60 * 1000;
    return setInterval(checkStreams, interval);
  } catch(e) { u.errorHandler(e, "Streaming Clockwork"); }
});

module.exports = Module;
