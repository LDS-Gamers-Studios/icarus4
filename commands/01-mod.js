const Augur = require("augurbot"),
  banned = require("../data/banned.json"),
  profanityFilter = require("profanity-matcher"),
  u = require("../utils/utils"),
  {USet} = require("../utils/tools");

const bannedWords = new RegExp(banned.words.join("|"), "i"),
  bannedLinks = new RegExp(`\\b(${banned.links.join("|").replace(".", "\.")})`, "i"),
  hasLink = /http(s)?:\/\/(\w+(-\w+)*\.)+\w+/,
  modLogs = "506575671242260490",
  pf = new profanityFilter(),
	scamLinks = new RegExp(`\\b(${banned.scam.join("|").replace(".", "\.")})`, "i");

// Imports the Google Cloud client library
const {Translate} = require('@google-cloud/translate');
const googleId = require("../config/google_api.json").creds.project_id;
const translate = new Translate({googleId});

const bans = new USet();
const cardReactions = ["👤", "✅", "⚠", "⛔", "🛑", "🔇"];

function blocked(member) {
  return member.client.channels.get(modLogs).send(`I think ${member} has me blocked. *sadface*`);
}

function filter(msg, text) {
  // PROFANITY FILTER
  let noWhiteSpace = text.toLowerCase().replace(/[\.,\/#!$%\^&\*;:\{\}=\-_`~"'\(\)\?\|]/g,"").replace(/\s\s+/g, " ");
  let filtered = pf.scan(noWhiteSpace);
  if ((filtered.length > 0) && (noWhiteSpace.length > 0)) warnCard(msg, filtered);
}

async function toEnglish(msg) {
  try {
    const [translation, data] = await translate.translate(msg.cleanContent, "en");
    msg.client.channels.get("543147492275912724").send(`${u.escapeText(msg.member.displayName)} (${data.data.translations[0].detectedSourceLanguage})${(msg.editedAt ? " [Edited]" : "")}: ${translation}`);
    return (translation ? translation : "");
  } catch(e) { u.alertError(e, msg); return ""; }
}

function processMessageLanguage(msg, edited = false) {
  if (msg.author.id != msg.client.user.id) {
    processDiscordInvites(msg);

    let match = null;

    // LINK FILTER
    if (hasLink.test(msg.cleanContent)) {
      if (match = bannedLinks.exec(msg.cleanContent)) {
        // Porn links
        warnCard(msg, match, true);
        return true;
      } else if (match = scamLinks.test(msg.cleanContent)) {
        // Scam links
        u.clean(msg, 0);
        msg.reply("that link is generally believed to be to a scam/phishing site. Please be careful!");
        warnCard(msg, ["Suspected scam links"].concat(match));
        return true;
      } else if (!msg.member.roles.has(Module.config.roles.trusted)) {
        // General untrusted link flag
        warnCard(msg, "Links prior to being trusted");
      }
    }

    // HARD LANGUAGE FILTER
    if (match = bannedWords.exec(msg.cleanContent)) {
      warnCard(msg, match, true);
      return true;
    }

    // SOFT LANGUAGE FILTER
    if (msg.channel.id == "543113993112518676") {
      toEnglish(msg).then(translation => filter(msg, translation));
    } else {
      filter(msg, msg.cleanContent);
    }
  }
};

function processDiscordInvites(msg) {
  let bot = msg.client;
  let invites = msg.cleanContent.match(/(http(s)?:\/\/)?discord(\.gg(\/invite)?|app\.com\/invite)\/\w+/ig);

  if (invites) {
    let modLog = [];

    invites = invites.map(inv => {
      inv = inv.replace(/(http(s)?:\/\/)?discord(\.gg(\/invite)?|app\.com\/invite)\//ig, "").replace(/\//g, "").trim();
      return bot.fetchInvite(inv);
    });

    Promise.all(invites).then((invites) => {
      if (invites.length > 0) {
        let external = invites.reduce((e, i) => (i && i.guild && (i.guild.id != Module.config.ldsg) ? e.concat(`Guild: ${i.guild.name}`, `Channel: ${i.channel.name}`) : e), ["External Discord Server Invite"]);
        if (external.length > 1) {
          warnCard(msg, external);
          u.clean(msg, 0);
          msg.channel.send("It is difficult to know what will be in another Discord server at any given time. *If* you feel that this server is appropriate to share, please only do so in direct messages.");
        }
      }
    }).catch(e => {
      if (e && e.message == "Unknown Invite") {
        warnCard(msg, "Unknown Discord Server Invite");
        u.clean(msg, 0);
        msg.channel.send("It is difficult to know what will be in another Discord server at any given time. *If* you feel that this server is appropriate to share, please only do so in direct messages.");
      } else u.alertError(e, msg);
    });
  }
};

async function warnCard(msg, filtered = null, call = false) {
  try {
    let infractionSummary = await Module.db.infraction.getSummary(msg.author.id);

    let embed = u.embed()
    .setColor("#FF0000")
    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL)
    .setDescription(msg.cleanContent + (msg.editedAt ? "\n[Edited]" : ""));

    filtered = (Array.isArray(filtered) ? filtered.join(", ") : filtered);
    if (filtered) {
      embed.addField("Match", filtered);
      if (filtered.includes("lmao") && !msg.author.bot) {
        try {
          let ankle = {
            discordId: msg.author.id,
            channel: msg.channel.id,
            message: msg.id,
          };
          await Module.db.ankle.save(ankle);
        } catch(e) { u.alertError(e, "Saving Ankle"); }
      }
    }

    embed.addField("Channel", `#${msg.channel.name}`)
    .addField("Jump to Post", msg.url)
    .addField(`Infraction Summary (${infractionSummary.time} Days)`, `Infractions: ${infractionSummary.count}\nPoints: ${infractionSummary.points}`)
    .setTimestamp((msg.editedAt ? msg.editedAt : msg.createdAt));

    // Minecraft Filter
    if (msg.channel.id == "121033996439257092")
      msg.client.channels.get('114490357474918401').send(embed);

    if (msg.author.bot)
      embed.setFooter("The user is a bot and the flag likely originated elsewhere. No reactions will be processed.");

    let card = await msg.client.channels.get(modLogs).send(embed);

    if (call) {
      msg.delete();

      let ldsg = msg.client.guilds.get(Module.config.ldsg);

      let callToArms = [ldsg.roles.get('503066022912196608')]; // Discord Mods
      if (msg.author.bot) {
        callToArms.push("The message has been deleted. The member was *not* muted, on account of being a bot.");
      } else {
        if (!msg.member.roles.has(Module.config.roles.muted)) {
          await msg.member.addRole(ldsg.roles.get(Module.config.roles.muted));
          if (msg.member.voiceChannel) msg.member.setMute(true);
          ldsg.channels.get("356657507197779968").send(`${msg.member}, you have been auto-muted in ${msg.guild.name}. Please review our Code of Conduct. A member of the management team will be available to discuss more details.\n\nhttp://ldsgamers.com/code-of-conduct`);
        }
        callToArms.push("The mute role has been applied and message deleted.");
      }

      await msg.client.channels.get(modLogs).send(callToArms.join("\n"));
    }

    if (!msg.author.bot)  {
      let infraction = {
        discordId: msg.author.id,
        channel: msg.channel.id,
        message: msg.id,
        flag: card.id,
        description: msg.cleanContent,
        mod: msg.client.user.id,
        value: 0
      };
      await Module.db.infraction.save(infraction);

      for (let i = 0; i < cardReactions.length; i++) {
        await card.react(cardReactions[i]);
      }
    }
  } catch(e) { u.alertError(e, "Mod Card Creation"); }
}

async function processCardReaction(reaction, mod, infraction) {
  try {
    if (reaction.users.filter(u => !u.bot).size > 1) return;
    let message = reaction.message;
    reaction = reaction.emoji.name;
    let embed = u.embed(message.embeds[0]);

    if ((reaction == "⏪") && (mod.id == infraction.mod)) {
      /***********************
      **  Retract a warning **
      ***********************/
      let retraction = await Module.db.infraction.retract(message.id, mod.id);
      if (retraction) {
        let infractionSummary = await Module.db.infraction.getSummary(retraction.discordId);
        embed.setColor(0x00ff00);
        embed.fields[2].value = `Infractions: ${infractionSummary.count}\nPoints: ${infractionSummary.points}`;
        embed.fields[3].value = `${mod.username} retracted the warning.`;

        message.edit({embed});
      }
    } else if (embed.color != 16292386) {
      /***************************************
      **  Only process non-processed cards  **
      ***************************************/
      return;
    } else if (reaction == cardReactions[0]) {
      /*********************
      **  Post Full Info  **
      *********************/
      let member = message.guild.members.get(infraction.discordId);

      let roleString = member.roles.map(role => role.name).join(", ");
      if (roleString.length > 1024) roleString = roleString.substr(0, roleString.indexOf(", ", 1000)) + " ...";

      let userDoc = await Module.db.user.fetchUser(member.id);

      let infractionSummary = await Module.db.infraction.getSummary(member.id);

      let infractionDescription = [`**${u.escapeText(member.displayName)}** has had **${infractionSummary.count}** infraction(s) in the last **${infractionSummary.time}** days, totalling **${infractionSummary.points}** points.`];
      if ((infractionSummary.count > 0) && (infractionSummary.detail.length > 0)) {
        for (let i = 0; i < infractionSummary.detail.length; i++) {
          let record = infractionSummary.detail[i];
          let mod = message.guild.members.get(record.mod);
          infractionDescription.push(`${record.timestamp.toLocaleDateString()} (${record.value}) pts, modded by ${mod.displayName}): ${record.description}`);
        }
      }

      infractionDescription = infractionDescription.join("\n");
      if (infractionDescription.length > 2048) infractionDescription = infractionDescription.substr(0, infractionDescription.indexOf("\n", 1950)) + "\n...";

      let infoEmbed = u.embed()
      .setAuthor(member.displayName, (member.user.displayAvatarURL ? member.user.displayAvatarURL : null))
      .setThumbnail(member.user.displayAvatarURL)
      .setDescription(infractionDescription)
      .addField("ID", member.id)
      .addField("Joined", member.joinedAt.toUTCString(), true)
      .addField("Account Created", member.user.createdAt.toUTCString(), true)
      .addField("Roles", roleString)
      .addField("Activity", `Posts: ${parseInt(userDoc.posts, 10).toLocaleString()}`, true)
      message.channel.send({embed: infoEmbed, disableEveryone: true});
      //Infraction Summary
    } else if (reaction == cardReactions[1]) {
      /********************
      **  Ignore a flag  **
      ********************/
      await Module.db.infraction.retract(message.id, infraction.mod);

      embed.setColor(0x00FF00);
      embed.addField("Resolved", mod.username + " cleared the flag.");
      embed.fields = embed.fields.filter(f => !f.name.startsWith("Jump"));
      await message.clearReactions();
      message.edit({embed});
    } else if (cardReactions.includes(reaction)) {
      /**************************
      **  Warn as appropriate  **
      **************************/
      try {
        let msg = await message.guild.channels.get(infraction.channel).fetchMessage(infraction.message);
        if (msg) u.clean(msg, 0);
      } catch(e) { noop(); }

      embed.setColor(0x0000FF);
      infraction.mod = mod.id;
      let member = message.guild.members.get(infraction.discordId);

      if (reaction == cardReactions[2]) {         // Minor infraction
        infraction.value = 1;
        embed.addField("Resolved", mod.username + " issued a 1 point warning.");
      } else if (reaction == cardReactions[3]) {  // Moderate infraction
        infraction.value = 5;
        embed.addField("Resolved", mod.username + " issued a 5 point warning.");
      } else if (reaction == cardReactions[4]) {  // Major infraction
        infraction.value = 10;
        embed.addField("Resolved", mod.username + " issued a 10 point warning.");
      } else if (reaction == cardReactions[5]) {  // Mute
        infraction.value = 10;
        if (member && !member.roles.has(Module.config.roles.muted)) {
          // Only mute them if they weren't already muted.
          await member.addRole(Module.config.roles.muted);
          if (member.voiceChannel) await member.setMute(true);
          message.client.channels.get("356657507197779968").send(`${member}, you have been muted in ${message.guild.name}. Please review our Code of Conduct. A member of the management team will be available to discuss more details.\n\nhttp://ldsgamers.com/code-of-conduct`);
        } else if (!member) {
          let memberRoles = (await Module.db.user.fetchUser(infraction.discordId)).roles;
          let roles = message.guild.roles.filter(r => memberRoles.includes(r.id) || r.id == Module.config.roles.muted);
          await Module.db.user.updateRoles({
            id: infraction.discordId,
            roles
          });
        }
        embed.addField("Resolved", mod.username + " muted the member.");
      }

      let inf = await Module.db.infraction.update(infraction._id, infraction);

      let infractionSummary = await Module.db.infraction.getSummary(infraction.discordId);

      if (member) {
        let quote = u.embed()
        .setAuthor(u.escapeText(member.displayName), member.user.displayAvatarURL)
        .addField("Channel", `#${message.guild.channels.get(infraction.channel).name}`)
        .setDescription(message.embeds[0].description)
        .setTimestamp(message.createdAt);

        let response = "We have received one or more complaints regarding content you posted. We have reviewed the content in question and have determined, in our sole discretion, that it is against our code of conduct (<https://ldsgamers.com/code-of-conduct>). This content was removed on your behalf. As a reminder, if we believe that you are frequently in breach of our code of conduct or are otherwise acting inconsistently with the letter or spirit of the code, we may limit, suspend or terminate your access to the LDSG Discord server.";

        member.send(`${response}\n\n**${mod.username}** has issued this warning.`, quote)
        .catch(() => blocked(member));
        //.catch(e => u.alertError(e, "Warning DM"));
      }

      embed.fields = embed.fields.filter(f => !f.name || !f.name.startsWith("Jump"));
      embed.fields.find(f => f.name && f.name.startsWith("Infraction")).value = `Infractions: ${infractionSummary.count}\nPoints: ${infractionSummary.points}`;

      await message.clearReactions();
      message.edit({embed});
    }

  } catch(e) { u.alertError(e, "Mod Card Reaction"); }
}

const Module = new Augur.Module();

/*******************
**  Mod Commands  **
*******************/
Module
.addCommand({name: "ankles",
  description: "View lost ankles",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    try {
      let time = parseInt(suffix.replace(/<@!?\d+>/ig, '').replace(msg.mentions.CHANNELS_PATTERN, '').trim(), 10) || 10000;

      let userMentions = u.userMentions(msg);
      let channelMentions = msg.mentions.channels;
      if (userMentions) {
        userMentions.forEach(async (userId) => {
          try {
            let data = await Module.db.ankle.getUserSummary(userId, time);
            if (data.perChannel.size > 0) {
              data.perChannel = data.perChannel.sort((v0, v1) => v1 - v0);

              let response = [];
              response.push(`${userId} has lost ${data.total} ankles over the last ${time} days in ${data.perChannel.size} channels:\`\`\``)
              for (const [chanId, count] of data.perChannel) {
                response.push(`#${msg.guild.channels.get(chanId).name}: ${count} ankles lost.`);
              }
              await msg.channel.send(response.join("\n") + "```");
            } else {
              msg.channel.send(msg.guild.members.get(userId.id).displayName + " still has all their ankles!");
            }
          } catch (e) { u.alertError(e, `Handling lost ankles for user: ${userId}`); }
        });
      }
      if (channelMentions.size > 0) {
        channelMentions.forEach(async (channelId) => {
          try {
            let data = await Module.db.ankle.getChannelSummary(channelId, time);
            if (data.perUser.size > 0) {
              data.perUser = data.perUser.sort((v0, v1) => v1 - v0);

              let response = [];
              response.push(`${data.perUser.size} users have lost ${data.total} ankles over the last ${time} days in ${channelId}:\`\`\``);
              for (const [userId, count] of data.perUser) {
                response.push(`${msg.guild.members.get(userId).displayName}: ${count} ankles lost.`);
              }
              await msg.channel.send(response.join("\n") + "```");
            } else {
              msg.channel.send(`No users have lost any ankles in ${channelId}!`);
            }
          } catch (e) { u.alertError(e, `Handling lost ankles for channel: ${channelId}`); }
        });
      }
      if (!userMentions && channelMentions.size == 0) { // No user or channel mentions, give high summary
        let data = await Module.db.ankle.getSummary(time);
        data.perUser = data.perUser.sort((v0, v1) => v1 - v0);
        data.perChannel = data.perChannel.sort((v0, v1) => v1 - v0);

        let response = [];
        response.push(`${data.perUser.size} users have lost ${data.total} ankles over the last ${time} days in ${data.perChannel.size} channels.`);
        if (data.perUser.size > 0) {
          response.push("Top 5 users:```");
          let displayCount = 0;
          for (const [userId, count] of data.perUser) {
            response.push(`${msg.guild.members.get(userId).displayName}: ${count} ankles lost.`);
            if (++displayCount == 5) break;
          }
          response[response.length-1] += "```";
        }
        if (data.perChannel.size > 0) {
          response.push("Top 5 channels:```");
          let displayCount = 0;
          for (const [chanId, count] of data.perChannel) {
            response.push(`${msg.guild.channels.get(chanId).name}: ${count} ankles lost.`);
            if (++displayCount == 5) break;
          }
          response.push("```");
        }
        await msg.channel.send(response.join("\n"));
      }
    } catch (e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "announce",
  description: "Announce a post!",
  syntax: "<messageId> (in channel with message)",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.has(Module.config.roles.management)),
  process: (msg, suffix) => {
    if (suffix) {
      msg.channel.fetchMessage(suffix).then(message => {
        let author = message.member;
        let embed = u.embed()
          .setAuthor(author.displayName, author.user.displayAvatarURL)
          .setTimestamp(message.createdAt)
          .setDescription(message.content);
        if (message.attachments && (message.attachments.size > 0))
          embed.attachFile(message.attachments.first().proxyURL);
        msg.client.channels.get("121752198731268099").send(embed);
      }).catch(e => { msg.reply("I couldn't find that message.").then(u.clean); });
    } else msg.reply("you need to tell me a message ID.").then(u.clean);
    u.clean(msg, 0);
  }
})
.addCommand({name: "ban",
  syntax: "<@user>",
  category: "Mod",
  description: "Ban mentioned user",
  permissions: (msg) => (msg.guild && (msg.member.hasPermission("BAN_MEMBERS") || msg.member.roles.has(Module.config.roles.mod))),
  process: (msg, suffix) => {
    u.clean(msg, 0);
    if (u.userMentions(msg)) {
      let reason = suffix.replace(/<@!?\d+>/ig, "").trim();
      // Get highest role that isn't "Live"
      const bannerHighRole = msg.member.roles.filter(r => r.id != "281135201407467520").sort((a, b) => b.position - a.position).first();
      u.userMentions(msg).forEach(async user => {
        try {
          // Make sure banner's highest role is higher than ban-ee's highest role
          const toBeBanned = await msg.guild.fetchMember(user);
          const bannedHighRole = toBeBanned.roles.filter(r => r.id != "281135201407467520").sort((a, b) => b.position - a.position).first();
          if (bannerHighRole.comparePositionTo(bannedHighRole) <= 0) return;
          try {
            let infraction = {
              discordId: user.id,
              description: (reason ? reason : "Member ban"),
              value: 30,
              mod: msg.author.id
            };
            let inf = await Module.db.infraction.save(infraction);

            let member = await msg.guild.fetchMember(user);
            if (member) {
              await member.send(`You were banned from ${msg.guild.name} for violating our code of conduct.${(reason ? ("\n" + reason) : "")}`).catch(() => blocked(member));
              bans.add(member.id);
              await member.ban({days: 2, reason: reason});
              msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** banned **${u.escapeText(member.displayName)}**${(reason ? (" for " + reason) : "")}`);
            } else msg.reply("That user is no longer part of the server.").then(u.clean);
          } catch(e) { u.alertError(e, msg); }
        } catch(e) { u.alertError(e, "Role Rank Comparison (Ban)"); }
      });
    } else {
      msg.reply("you need to tell me who to ban!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "channelactivity",
  description: "See how active a channel has been over the last two weeks",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.management) || msg.member.roles.has("205826273639923722"))),
  process: (msg) => {
    let last = Date.now() - (14 * 24 * 60 * 60 * 1000);
    let fetch = msg.guild.channels.filter(c => (c.type == "text" && c.permissionsFor(msg.client.user).has("VIEW_CHANNEL") && (c.parentID != "363019058158895117"))).map(c => c.fetchMessages({limit: 100}));
    Promise.all(fetch).then(channelMsgs => {
      msg.channel.send(
        channelMsgs
          .map(msgs => {
            return {
              name: msgs.first().channel.name,
              messages: msgs.filter(m => m.createdTimestamp > last)
            };
          })
          .sort((a, b) => b.messages.size - a.messages.size)
          .map(channel => `${channel.name}: ${channel.messages.size}`)
          .join("\n"),
        {split: true}
      );
    });
  }
})
.addCommand({name: "filter",
  description: "Add a word to the language filter",
  category: "Mod",
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.management) || msg.member.roles.has("205826273639923722"))),
  process: (msg, suffix) => {
    u.clean(msg, 0);
    suffix = suffix.toLowerCase().trim();
    if (pf.add_word(suffix)) {
      msg.client.channels.get(modLogs).send(`ℹ️ **${msg.member.displayName}** has added "${suffix}" to the language filter.`);
    }
  }
})
.addCommand({name: "infractionsummary",
  syntax: "<@user> [days]",
  description: "View a summary of a user's infractions",
  category: "Mod",
  aliases: ["warnsummary", "warningsummary"],
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    if (u.userMentions(msg)) {
      try {
        let ldsg = msg.guild;
        userId = u.userMentions(msg).first();
        let member = await ldsg.fetchMember(userId);
        let time = parseInt(suffix.replace(/<@!?\d+>/ig, '').trim(), 10);
        if (!Number.isInteger(time)) time = 28;
        let data = await Module.db.infraction.getSummary(member.id, time);
        let response = [`**${u.escapeText(member.displayName)}** has had **${data.count}** infraction(s) in the last **${data.time}** day(s), totaling **${data.points}** points.`];

        if ((data.count > 0) && (data.detail.length > 0)) {
          data.detail.forEach(record => {
            let mod = ldsg.members.get(record.mod);
            response.push(`${record.timestamp.toLocaleDateString()} (${record.value} pts, modded by ${mod.displayName}): ${record.description}`);
          });
        }
        msg.channel.send(response.join("\n"), {split: true});
      } catch(e) { u.alertError(e, m); }
    } else {
      msg.reply("you need to tell me whose summary you want to view.")
        .then(u.clean);
    }
  }
})
.addCommand({name: "kick",
  syntax: "<@user(s)> [reason]",
  description: "Kick a user from the server.",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.member.hasPermission("KICK_MEMBERS") || msg.member.roles.has(Module.config.roles.mod))),
  process: (msg, suffix) => {
    u.clean(msg, 0);
    let reason = suffix.replace(/<@!?\d+>/ig, "").trim();
    if (u.userMentions(msg)) {
      let ldsg = msg.guild;
      // Get highest role that isn't "Live"
      const kickerHighRole = msg.member.roles.filter(r => r.id != "281135201407467520").sort((a, b) => b.position - a.position).first();
      u.userMentions(msg).forEach(async user => {
        try {
          // Make sure kicker's highest role is higher than kick-ee's highest role
          const toBeKicked = await msg.guild.fetchMember(user);
          const kickedHighRole = toBeKicked.roles.filter(r => r.id != "281135201407467520").sort((a, b) => b.position - a.position).first();
          if (kickerHighRole.comparePositionTo(kickedHighRole) <= 0) return;
          try {
            let infraction = {
              discordId: user.id,
              description: (reason ? reason : "Member kick"),
              value: 20,
              mod: msg.author.id
            };
            let inf = await Module.db.infraction.save(infraction);

            let member = await ldsg.fetchMember(user);
            if (member) {
              await member.send(`You were kicked from ${ldsg.name} for ${reason ? reason : "violating our code of conduct"}.`).catch(() => blocked(member));
              await member.kick(reason);
              msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** kicked **${u.escapeText(member.displayName)}**${reason ? (" for " + reason) : ""}`);
            }
          } catch(e) { u.alertError(e, msg); }
        } catch(e) { u.alertError(e, "Role Rank Comparison (Kick)"); }
      });
    } else {
      msg.reply("you need to tell me who to kick!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "lady",
  syntax: "<@user>",
  description: "Note an LDSG Lady",
  category: "Mod",
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: (msg) => {
    u.clean(msg, 0);
    if (u.userMentions(msg)) {
      u.userMentions(msg).forEach(function(userId) {
        msg.guild.fetchMember(userId).then(member => {
          member.addRole("253214700446285825");
          msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** added **${u.escapeText(member.displayName)}** to the LDSG Lady group.`);
        });
      });
    } else {
      msg.reply("you need to tell me which users to add to the role!")
      .then(u.clean);
    }
  }
})
.addCommand({name: "mute",
  syntax: "<@user> [time]",
  description: "Mute a user.",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: (msg, suffix) => {
    u.clean(msg, 0);
    if (u.userMentions(msg)) {
      let duration = parseInt(suffix.replace(/<@!?\d+>/ig, '').toLowerCase().trim(), 10);
      u.userMentions(msg).forEach(async (user) => {
        try {
          let member = await msg.guild.fetchMember(user);
          if (member && !member.roles.has(Module.config.roles.muted)) {
            member.addRole(Module.config.roles.muted);
            if (member.voiceChannel) member.setMute(true);
            msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** muted **${u.escapeText(member.displayName)}**${(duration ? " for " + duration + " minutes." : "")}`);
            msg.client.channels.get("356657507197779968").send(`${member}, you have been muted in ${msg.guild.name}. Please review our Code of Conduct. A member of the management team will be available to discuss more details.\n\nhttp://ldsgamers.com/code-of-conduct`);
          }
          if (duration) {
            setTimeout(function(unlucky, timeout) {
              unlucky.removeRole(Module.config.roles.muted);
              if (unlucky.voiceChannel) unlucky.setMute(false);
              msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(member.displayName)}** has automatically been unmuted after ${timeout} minutes.`);
            }, (duration * 60000), member, duration);
          }
        } catch(e) { u.alertError(e, msg); }
      });
    } else {
      msg.reply("you need to tell me which users to mute!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "note",
  syntax: "<@user> <message>",
  description: "Record a mod note",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: (msg, suffix) => {
    u.clean(msg, 0);
    let comment = suffix.replace(/<@!?\d+>/ig, '').replace(/\s\s+/g, ' ').trim();
    if (u.userMentions(msg) && comment) {
      u.userMentions(msg).forEach(async userId => {
        try {
          let member = await msg.guild.fetchMember(userId);
          let inf = await Module.db.infraction.save({
            discordId: member.id,
            value: 0,
            description: comment,
            message: msg.id,
            channel: msg.channel.id,
            mod: msg.author.id
          });
          let summary = await Module.db.infraction.getSummary(member.id);

          let card = u.embed()
          .setColor("#0000FF")
          .setAuthor(u.escapeText(member.displayName), member.user.displayAvatarURL)
          .setDescription(comment)
          .addField("Resolved", `${msg.author.username} added a note.`)
          .addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count}\nPoints: ${summary.points}`)
          .setTimestamp();

          msg.client.channels.get(modLogs).send(card);
        } catch(e) { u.alertError(e, msg); }
      });
    } else {
      msg.reply("you need to tell me who and what the note is.")
        .then(u.clean);
    }
  }
})
.addCommand({name: "purge",
  syntax: "<number of messages>",
  description: "Delete a number of messages",
  category: "Mod",
  permissions: (msg) => (msg.guild && msg.channel.permissionsFor(msg.member).has("MANAGE_MESSAGES")),
  process: async (msg, suffix) => {
    try {
      let purge = parseInt(suffix, 10);
      let num = purge + 1;
      if (num) {
        while (num > 100) {
          await msg.channel.bulkDelete(100);
          num -= 100;
        }
        if (num > 0) await msg.channel.bulkDelete(num);
        msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** purged ${purge} messages in ${msg.channel}`);
      } else {
        msg.reply("you need to tell me how many to delete.")
          .then(u.clean);
      }
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "rename",
  aliases: ["nick", "nickname"],
  syntax: "<@user> <nickname>",
  description: "Change a user's nickname",
  category: "Mod",
  permissions: (msg) => (msg.guild && msg.channel.permissionsFor(msg.member).has("MANAGE_NICKNAMES")),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    let setNick = suffix.replace(/<@!?\d+>/g, "").trim();
    if (u.userMentions(msg)) {
      u.userMentions(msg).forEach(async user => {
        try {
          const {names, colors, adjectives} = require("../data/nameParts.json");
          let member = await msg.guild.fetchMember(user);
          let oldNick = member.displayName;
          let newNick = setNick;

          while (!newNick || newNick.length > 32) {
            newNick = u.rand(adjectives) + " " + u.rand(colors) + " " + u.rand(names);
          }

          member.setNickname(newNick)

          let comment = `Set nickname to ${newNick} from ${oldNick}.`;

          try {
            let inf = await Module.db.infraction.save({
              discordId: member.id,
              value: 0,
              description: comment,
              message: msg.id,
              channel: msg.channel.id,
              mod: msg.author.id
            });
            let summary = await Module.db.infraction.getSummary(member.id);

            let card = u.embed()
            .setColor("#0000FF")
            .setAuthor(u.escapeText(member.displayName), member.user.displayAvatarURL)
            .setDescription(comment)
            .addField("Resolved", `${msg.author.username} changed the user's nickname from ${oldNick} to ${newNick}.`)
            .addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count}\nPoints: ${summary.points}`)
            .setTimestamp();

            msg.client.channels.get(modLogs).send(card);
          } catch(e) { u.alertError(e, msg); }

          try {
            member.send(`Your nickname has been changed in ${msg.guild.name} from ${oldNick} to ${newNick}. Please contact a moderator or member of the management team if you have questions regarding the change.`).catch(() => blocked(member));
          } catch(e) {
            // msg.channel.send("Could not inform user of the nickname change.")
            //   .then(u.clean);
            u.alertError(e, msg);
          }
        } catch(e) {
          // msg.channel.send(`Could not change ${userId}'s nickname to ${newNick}.`)
          //   .then(u.clean);
          u.alertError(e, msg);
        }
      });
    } else {
      msg.reply("you need to tell me whose nickname to change!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "swagoteer",
  syntax: "<@user>",
  description: "Give a user the *Swagoteer* role.",
  category: "Mod",
  hidden: true,
  permissions: (msg) => Module.config.adminId.includes(msg.author.id),
  process: async (msg) => {
    u.clean(msg);
    let members = msg.mentions.members;
    if (members && members.size > 0) {
      let swagoteer = "441267815622639616";
      members.forEach(async (member) => {
        if (member.roles.has(swagoteer)) {
          member.send("Thanks for your purchase from LDSG!").catch(() => blocked(member));
        } else {
          let m = await member.addRole(swagoteer);
          m.send("Thanks for your purchase from LDSG! You've been awarded the **Swagoteer** role!").catch(() => blocked(m));
        }
      });
      msg.reply(`I added the *Swagoteer* role to ${members.map(m => m.displayName).join(", ")}`)
        .then(u.clean);
    } else {
      msg.reply("you need to @mention the user(s) you want to give the role!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "trust",
  syntax: "<@user>",
  description: "Trust a user",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: (msg) => {
    u.clean(msg, 0);
    if (u.userMentions(msg)) {
      u.userMentions(msg).forEach(function(userId) {
        msg.guild.fetchMember(userId).then(member => {
          member.addRole(Module.config.roles.trusted);
          try {
            member.send("You have been marked as \"Trusted\" in " + msg.guild.name + ". This means you are now permitted to post images and links in chat. Please remember to follow the Code of Conduct when doing so.\n<http://ldsgamers.com/code-of-conduct>").catch(() => blocked(member));
          } catch (e) {
            msg.client.channels.get(modLogs).send(`ℹ️ I think ${msg.member} has blocked me.`);
          }
          msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** trusted **${u.escapeText(member.displayName)}**`);
        });
      });
    } else {
      msg.reply("you need to tell me which users to trust!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "trustaudit",
  description: "List semi-active (15 posts or more) untrusted users",
  category: "Mod",
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    try {
      let threshold = parseInt(suffix, 10) || 15;
      const ldsg = msg.guild;
      let users = await Module.db.user.getUsers({posts: {$gt: threshold}});
      let response = [];
      for (const user of users) {
        let member = ldsg.members.get(user.discordId);
        if (member && !member.roles.has(Module.config.roles.trusted)) {
          response.push({member: member, posts: user.posts});
        }
      }
      if (response.length > 0)
        msg.channel.send(response.sort((a, b) => b.posts - a.posts).map(m => `${m.member}: ${m.posts} posts, joined ${m.member.joinedAt.toLocaleDateString()}`).join("\n"), {split: true});
      else msg.channel.send(`No untrusted users with ${threshold} posts found.`);
    } catch(e) { u.alertError(e, msg); }
  }
})
.addCommand({name: "unfilter",
  description: "Remove a word from the language filter",
  category: "Mod",
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.management) || msg.member.roles.has("205826273639923722"))),
  process: (msg, suffix) => {
    suffix = suffix.toLowerCase().trim();
    if (pf.remove_word(suffix)) {
      msg.react("👌");
      msg.client.channels.get(modLogs).send(`ℹ️ **${msg.member.displayName}** has removed "${suffix}" from the language filter.`);
    }
  }
})
.addCommand({name: "unmute",
  syntax: "<@user>",
  description: "Unmute a user", hidden: true,
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: (msg) => {
    u.clean(msg, 0);
    if (u.userMentions(msg)) {
      u.userMentions(msg).forEach(function(userId) {
        msg.guild.fetchMember(userId).then(member => {
          member.removeRole(Module.config.roles.muted);
          if (member.voiceChannel) member.setMute(false);
          msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** unmuted **${u.escapeText(member.displayName)}**`);
        });
      });
    } else {
      msg.reply("you need to tell me which users to unmute!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "untrust",
  syntax: "<@user>",
  description: "Untrust a user.", hidden: true,
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: (msg) => {
    u.clean(msg, 0);
    if (u.userMentions(msg)) {
      u.userMentions(msg).forEach(function(userId) {
        msg.guild.fetchMember(userId).then(member => {
          member.removeRole(Module.config.roles.trusted);
          try {
            member.send("You have been removed from \"Trusted\" in " + msg.guild.name + ". This means you no longer have the ability to post images. Please remember to follow the Code of Conduct when posting images or links.\n<http://ldsgamers.com/code-of-conduct>").catch(() => blocked(member));
          } catch (e) {
            msg.client.channels.get(modLogs).send(`ℹ️ I think ${msg.member} has blocked me.`);
          }
          msg.client.channels.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** untrusted **${u.escapeText(member.displayName)}**`);
        });
      });
    } else {
      msg.reply("you need to tell me which users to untrust!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "warn",
  syntax: "<@user> [value] [message]",
  description: "Record a warning",
  category: "Mod",
  aliases: ["infraction", "warning"],
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.mod) || msg.member.roles.has(Module.config.roles.management))),
  process: (msg, suffix) => {
    u.clean(msg, 0);
    if (u.userMentions(msg)) {
      let comment = suffix.replace(/<@!?\d+>/ig, '').replace(/\s\s+/g, ' ').trim();
      let value = comment.substring(0, comment.indexOf(" "));

      if (value.toLowerCase().startsWith("min")) value = 1;
      else if (value.toLowerCase().startsWith("mod") || value.toLowerCase().startsWith("med")) value = 8;
      else if (value.toLowerCase().startsWith("maj")) value = 15;
      else value = parseInt(value, 10);

      if (Number.isInteger(value)) comment = comment.substr(comment.indexOf(" ")+1);
      else value = 1;

      u.userMentions(msg).forEach(async userId => {
        try {
          let member = await msg.guild.fetchMember(userId);
          let inf = await Module.db.infraction.save({
            discordId: member.id,
            value: value,
            description: comment,
            message: msg.id,
            channel: msg.channel.id,
            mod: msg.author.id
          });
          let summary = await Module.db.infraction.getSummary(member.id);

          let response = "We have received one or more complaints regarding content you posted. We have reviewed the content in question and have determined, in our sole discretion, that it is against our code of conduct (<http://ldsgamers.com/code-of-conduct>). This content was removed on your behalf. As a reminder, if we believe that you are frequently in breach of our code of conduct or are otherwise acting inconsistently with the letter or spirit of the code, we may limit, suspend or terminate your access to the LDSG discord server.";
          member.send(`${response}\n\n**${msg.author.username}** has issued you a warning for:\n${comment}`).catch(() => blocked(member));

          let card = u.embed()
          .setColor("#0000FF")
          .setAuthor(u.escapeText(member.displayName), member.user.displayAvatarURL)
          .setDescription(comment)
          .addField("Resolved", `${msg.author.username} issued a ${value} point warning.`)
          .addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count}\nPoints: ${summary.points}`)
          .setTimestamp();

          msg.client.channels.get(modLogs).send(card);
        } catch(e) { u.alertError(e, msg); }
      });
    } else msg.reply("you need to tell me who and what the infraction is.").then(u.clean);
  }
});

/*************
**  Events  **
*************/
Module
.addEvent("channelCreate", (channel) => {
  if (channel.guild && (channel.guild.id == Module.config.ldsg)) {
    let muted = channel.guild.roles.get(Module.config.roles.muted);
    channel.overwritePermissions(muted, {
      VIEW_CHANNEL: false,
      CONNECT: false,
      SEND_MESSAGES: false,
      SPEAK: false
    }).catch(e => u.alertError(e, "Update new channel permissions."));
  }
})
.addEvent("guildBanAdd", (guild, user) => {
  if ((guild.id == Module.config.ldsg) && !bans.has(user.id)) guild.client.channels.get(modLogs).send(`**${user.username}** has been banned.`);
})
.addEvent("message", (msg) => {
  if (msg.guild && msg.member && msg.guild.id == Module.config.ldsg) return processMessageLanguage(msg);
})
.addEvent("messageReactionAdd", async (reaction, user) => {
  try {
    let message = reaction.message;
    if ((message.channel.id == modLogs) && !user.bot && (message.author.id == message.client.user.id) && (cardReactions.includes(reaction.emoji.name) || reaction.emoji.name == "⏪")) {
      let flag = await Module.db.infraction.getByFlag(message.id);
      if (flag) processCardReaction(reaction, user, flag);
    }
  } catch(e) { u.alertError(e, "Card Reaction Processing"); }
})
.addEvent("messageUpdate", (old, msg) => {
  if (msg.guild && msg.member && msg.guild.id == Module.config.ldsg) return processMessageLanguage(msg, true);
});

module.exports = Module;
