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

const bans = new USet();
const mutes = new u.Collection();

const cardReactions = ["👤", "✅", "⚠", "⛔", "🛑", "🔇"];

function blocked(member) {
  return member.client.channels.cache.get(modLogs).send(`I think ${member} has me blocked. *sadface*`);
}

function filter(msg, text) {
  // PROFANITY FILTER
  let noWhiteSpace = text.toLowerCase().replace(/[\.,\/#!$%\^&\*;:\{\}=\-_`~"'\(\)\?\|]/g,"").replace(/\s\s+/g, " ");
  let filtered = pf.scan(noWhiteSpace);
  if ((filtered.length > 0) && (noWhiteSpace.length > 0)) {
    warnCard(msg, filtered);
    return true;
  } else return false;
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
      } else if (!msg.member.roles.cache.has(Module.config.roles.trusted)) {
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
    filter(msg, msg.cleanContent);

    if (msg.embeds.length > 0) {
      for (let embed of msg.embeds) {
        let preview = [embed.author ? embed.author.name : "", embed.title, embed.description].join("\n");
        let match;
        if (match = bannedWords.exec(preview)) {
          msg.reply("it looks like that link might have some harsh language in the preview. Please be careful!").then(u.clean);
          warnCard(msg, ["Link preview language"].concat(match));
          u.clean(msg, 0);
          break;
        }
        if (filter(msg, preview)) {
          msg.reply("it looks like that link might have some language in the preview. Please be careful!").then(u.clean);
          msg.suppressEmbeds().catch(u.noop);
          break;
        }
      }
    }
  }
};

function processDiscordInvites(msg) {
  let bot = msg.client;
  let invites = msg.cleanContent.match(/(http(s)?:\/\/)?discord(\.gg(\/invite)?|app\.com\/invite|\.com\/invite)\/\w+/ig);

  if (invites) {
    let modLog = [];

    invites = invites.map(inv => bot.fetchInvite(inv.trim()));

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
      } else u.errorHandler(e, msg);
    });
  }
};

async function warnCard(msg, filtered = null, call = false) {
  try {
    let infractionSummary = await Module.db.infraction.getSummary(msg.author.id);

    let embed = u.embed()
    .setTimestamp()
    .setColor("#FF0000")
    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL({dynamic: true}))
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
        } catch(e) { u.errorHandler(e, "Saving Ankle"); }
      }
    }

    embed.addField("Channel", `#${msg.channel.name}`)
    .addField("Jump to Post", msg.url)
    .addField(`Infraction Summary (${infractionSummary.time} Days)`, `Infractions: ${infractionSummary.count}\nPoints: ${infractionSummary.points}`)
    .setTimestamp((msg.editedAt ? msg.editedAt : msg.createdAt));

    // Minecraft Filter
    if (msg.channel.id == "121033996439257092")
      msg.client.channels.cache.get('114490357474918401').send({embed});

    if (msg.author.bot)
      embed.setFooter("The user is a bot and the flag likely originated elsewhere. No reactions will be processed.");

    let card = await msg.client.channels.cache.get(modLogs).send({embed});

    if (call) {
      msg.delete();

      let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);

      let callToArms = [ldsg.roles.cache.get('503066022912196608')]; // Discord Mods
      if (msg.author.bot) {
        callToArms.push("The message has been deleted. The member was *not* muted, on account of being a bot.");
      } else {
        if (!msg.member.roles.cache.has(Module.config.roles.muted)) {
          await msg.member.roles.add(ldsg.roles.cache.get(Module.config.roles.muted));
          if (msg.member.voice.channel) {
            msg.member.voice.kick("Auto-mute");
          }
          ldsg.channels.cache.get("356657507197779968").send(`${msg.member}, you have been auto-muted in ${msg.guild.name}. Please review our Code of Conduct. A member of the management team will be available to discuss more details.\n\nhttp://ldsgamers.com/code-of-conduct`);
        }
        callToArms.push("The mute role has been applied and message deleted.");
      }

      await msg.client.channels.cache.get(modLogs).send(callToArms.join("\n"));
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
  } catch(e) { u.errorHandler(e, "Mod Card Creation"); }
}

async function processCardReaction(reaction, mod, infraction) {
  try {
    if (reaction.users.cache.filter(u => !u.bot).size > 1) return;
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
    } else if (embed.color != 0xf89a22) {
      /***************************************
      **  Only process non-processed cards  **
      ***************************************/
      return;
    } else if (reaction == cardReactions[0]) {
      /*********************
      **  Post Full Info  **
      *********************/
      let member = message.guild.members.cache.get(infraction.discordId);

      let roleString = member.roles.cache.map(role => role.name).join(", ");
      if (roleString.length > 1024) roleString = roleString.substr(0, roleString.indexOf(", ", 1000)) + " ...";

      let userDoc = await Module.db.user.fetchUser(member.id);

      let infractionSummary = await Module.db.infraction.getSummary(member.id);

      let infractionDescription = [`**${u.escapeText(member.displayName)}** has had **${infractionSummary.count}** infraction(s) in the last **${infractionSummary.time}** days, totalling **${infractionSummary.points}** points.`];
      if ((infractionSummary.count > 0) && (infractionSummary.detail.length > 0)) {
        for (let record of infractionSummary.detail) {
          let mod = message.guild.members.cache.get(record.mod);
          infractionDescription.push(`${record.timestamp.toLocaleDateString()} (${record.value}) pts, modded by ${mod.displayName}): ${record.description}`);
        }
      }

      infractionDescription = infractionDescription.join("\n");
      if (infractionDescription.length > 2048) infractionDescription = infractionDescription.substr(0, infractionDescription.indexOf("\n", 1950)) + "\n...";

      let infoEmbed = u.embed()
      .setTimestamp()
      .setAuthor(member.displayName, member.user.displayAvatarURL())
      .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
      .setDescription(infractionDescription)
      .addField("ID", member.id)
      .addField("Joined", member.joinedAt.toUTCString(), true)
      .addField("Account Created", member.user.createdAt.toUTCString(), true)
      .addField("Roles", roleString)
      .addField("Activity", `Posts: ${parseInt(userDoc.posts, 10).toLocaleString()}`, true)
      message.channel.send({embed: infoEmbed, disableEveryone: true});
    } else if (reaction == cardReactions[1]) {
      /********************
      **  Ignore a flag  **
      ********************/
      await Module.db.infraction.retract(message.id, infraction.mod);

      embed.setColor(0x00FF00);
      embed.addField("Resolved", mod.username + " cleared the flag.");
      embed.fields = embed.fields.filter(f => !f.name.startsWith("Jump"));
      await message.reactions.removeAll();
      message.edit({embed});
    } else if (cardReactions.includes(reaction)) {
      /**************************
      **  Warn as appropriate  **
      **************************/
      try {
        let msg = await message.guild.channels.cache.get(infraction.channel).messages.fetch(infraction.message);
        if (msg) u.clean(msg, 0);
      } catch(e) { u.noop(); }

      embed.setColor(0x0000FF);
      infraction.mod = mod.id;
      let member = message.guild.members.cache.get(infraction.discordId);

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
        if (member && !member.roles.cache.has(Module.config.roles.muted)) {
          try {
            // Only mute them if they weren't already muted.
            await member.roles.add(Module.config.roles.muted);
            await member.roles.add(Module.config.roles.untrusted);
            if (member.voice.channel) {
              await member.voice.kick("User mute");
            };
            message.client.channels.cache.get("356657507197779968").send(`${member}, you have been muted in ${message.guild.name}. Please review our Code of Conduct. A member of the management team will be available to discuss more details.\n\nhttp://ldsgamers.com/code-of-conduct`);
          } catch(error) { u.errorHandler(error, "Mute user via card"); }
        } else if (!member) {
          let roles = (await Module.db.user.fetchUser(infraction.discordId)).roles.concat(Module.config.roles.muted, Module.config.roles.untrusted);
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
        .setAuthor(u.escapeText(member.displayName), member.user.displayAvatarURL())
        .addField("Channel", `#${message.guild.channels.cache.get(infraction.channel).name}`)
        .setDescription(message.embeds[0].description)
        .setTimestamp(message.createdAt);

        let response = "We have received one or more complaints regarding content you posted. We have reviewed the content in question and have determined, in our sole discretion, that it is against our code of conduct (<https://ldsgamers.com/code-of-conduct>). This content was removed on your behalf. As a reminder, if we believe that you are frequently in breach of our code of conduct or are otherwise acting inconsistently with the letter or spirit of the code, we may limit, suspend or terminate your access to the LDSG Discord server.";

        member.send(`${response}\n\n**${mod.username}** has issued this warning.`, {embed: quote})
        .catch(() => blocked(member));
      }

      embed.fields = embed.fields.filter(f => !f.name || !f.name.startsWith("Jump"));
      embed.fields.find(f => f.name && f.name.startsWith("Infraction")).value = `Infractions: ${infractionSummary.count}\nPoints: ${infractionSummary.points}`;

      await message.reactions.removeAll();
      message.edit({embed});
    }
  } catch(e) { u.errorHandler(e, "Mod Card Reaction"); }
}

const Module = new Augur.Module();

/*******************
**  Mod Commands  **
*******************/
Module
.addCommand({name: "ankles",
  description: "View lost ankles",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    try {
      let time = parseInt(suffix.replace(/<@!?\d+>/ig, '').replace(msg.mentions.CHANNELS_PATTERN, '').trim(), 10) || 10000;
      let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));

      let userMentions = u.userMentions(msg, true);
      let channelMentions = msg.mentions.channels;
      if (userMentions.size > 0) {
        for (const [memberId, member] of userMentions) {
          try {
            let data = await Module.db.ankle.getUserSummary(memberId, time);
            if (data.perChannel.size > 0) {
              data.perChannel = data.perChannel.sort((v0, v1) => v1 - v0);

              let response = [];
              if (since < new Date(2020, 4, 22)) {
                response.push(`${member} has lost ${data.total} ankles since 4/22/2020 in ${data.perChannel.size} channels:\`\`\``);
              } else {
                response.push(`${member} has lost ${data.total} ankles over the last ${time} days in ${data.perChannel.size} channels:\`\`\``);
              }

              for (const [chanId, count] of data.perChannel) {
                response.push(`#${msg.guild.channels.cache.get(chanId).name}: ${count} ankles lost.`);
              }
              await msg.channel.send(response.join("\n") + "```");
            } else {
              msg.channel.send(member.displayName + " still has all their ankles!");
            }
          } catch (e) { u.errorHandler(e, `Handling lost ankles for user: ${member.displayName}`); }
        }
      }
      if (channelMentions.size > 0) {
        for (let [channelId, channel] of channelMentions) {
          try {
            let data = await Module.db.ankle.getChannelSummary(channel, time);
            if (data.perUser.size > 0) {
              data.perUser = data.perUser.sort((v0, v1) => v1 - v0);

              let response = [];
              if (since < new Date(2020, 4, 22)) {
                response.push(`${data.perUser.size} users have lost ${data.total} ankles since 4/22/2020 in ${channel}:\`\`\``);
              } else {
                response.push(`${data.perUser.size} users have lost ${data.total} ankles over the last ${time} days in ${channel}:\`\`\``);
              }

              for (const [userId, count] of data.perUser) {
                response.push(`${msg.guild.members.cache.get(userId).displayName}: ${count} ankles lost.`);
              }
              await msg.channel.send(response.join("\n") + "```");
            } else {
              msg.channel.send(`No users have lost any ankles in ${channel}!`);
            }
          } catch (e) { u.errorHandler(e, `Handling lost ankles for channel: ${channel.name}`); }
        }
      }
      if (!userMentions && channelMentions.size == 0) { // No user or channel mentions, give high summary
        let data = await Module.db.ankle.getSummary(time);
        data.perUser = data.perUser.sort((v0, v1) => v1 - v0);
        data.perChannel = data.perChannel.sort((v0, v1) => v1 - v0);

        let response = [];
        if (since < new Date(2020, 4, 22)) {
          response.push(`${data.perUser.size} users have lost ${data.total} ankles since 4/22/2020 in ${data.perChannel.size} channels.`);
        } else {
          response.push(`${data.perUser.size} users have lost ${data.total} ankles over the last ${time} days in ${data.perChannel.size} channels.`);
        }

        if (data.perUser.size > 0) {
          response.push("Top 5 users:```");
          let displayCount = 0;
          for (const [userId, count] of data.perUser) {
            response.push(`${msg.guild.members.cache.get(userId).displayName}: ${count} ankles lost.`);
            if (++displayCount == 5) break;
          }
          response[response.length-1] += "```";
        }
        if (data.perChannel.size > 0) {
          response.push("Top 5 channels:```");
          let displayCount = 0;
          for (const [chanId, count] of data.perChannel) {
            response.push(`${msg.guild.channels.cache.get(chanId).name}: ${count} ankles lost.`);
            if (++displayCount == 5) break;
          }
          response.push("```");
        }
        await msg.channel.send(response.join("\n"));
      }
    } catch (e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "announce",
  description: "Announce a post!",
  syntax: "<messageId> (in channel with message)",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.cache.has(Module.config.roles.management)),
  process: async (msg, suffix) => {
    if (suffix) {
      try {
        let message = msg.channel.messages.fetch(suffix);
        let author = message.member;
        let embed = u.embed()
          .setAuthor(author.displayName, author.user.displayAvatarURL())
          .setTimestamp(message.createdAt)
          .setDescription(message.content);
        if (message.attachments && (message.attachments.size > 0))
          embed.attachFiles([message.attachments.first().proxyURL]);
        msg.client.channels.cache.get("121752198731268099").send(embed);
      } catch(error) { msg.reply("I couldn't find that message.").then(u.clean); };
    } else msg.reply("you need to tell me a message ID.").then(u.clean);
    u.clean(msg, 0);
  }
})
.addCommand({name: "ban",
  syntax: "<@user>",
  category: "Mod",
  description: "Ban mentioned user",
  permissions: (msg) => (msg.guild && (msg.member.hasPermission("BAN_MEMBERS") || msg.member.roles.cache.has(Module.config.roles.mod))),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    const bannerHighRole = msg.member.roles.cache.filter(r => r.id != "281135201407467520").sort((a, b) => b.comparePositionTo(a)).first();
    const mentions = /<@!?(\d+)>/ig;
    const reason = suffix.replace(mentions, "").trim() || "[Member Ban]: Violating the Code of Conduct";
    let match;
    let banCount = 0;
    while (match = mentions.exec(suffix)) {
      userId = match[1];
      try {
        bans.add(userId);
        let member = await msg.guild.members.fetch(userId);
        if (member) {
          const bannedHighRole = member.roles.cache.filter(r => r.id != "281135201407467520").sort((a, b) => b.comparePositionTo(a)).first();
          if (bannerHighRole.comparePositionTo(bannedHighRole) <= 0) {
            msg.reply(`you cannot ban ${member.displayName}!`);
            continue;
          } else {
            const infraction = {
              discordId: member.id,
              description: reason,
              value: 30,
              mod: msg.author.id
            };
            await (member.send(`You were banned from ${msg.guild.name} for ${reason}`).catch(() => blocked(member)));
            await member.ban({days: 2, reason});
            msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** banned **${u.escapeText(member.displayName)}** for ${reason}`);
          }
        } else {
          msg.guild.members.ban(userId, {days: 2, reason});
        }
        let memberDoc = await Module.db.user.fetchUser(userId);
        memberDoc.roles = memberDoc.roles.filter(r => r != Module.config.roles.trusted).concat(Module.config.roles.muted, Module.config.roles.untrusted);
        await Module.db.user.update(userId, {roles: memberDoc.roles});
        banCount++;
      } catch(error) { u.errorHandler(error, msg); }
    }
    if (banCount > 0) {
      msg.reply(`${banCount} user(s) banned.`).then(u.clean);
    } else {
      msg.reply("you need to tell me who to ban!").then(u.clean);
    }
  }
})
.addCommand({name: "channelactivity",
  description: "See how active a channel has been over the last two weeks",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.cache.has(Module.config.roles.management) || msg.member.roles.cache.has("205826273639923722"))),
  process: async (msg) => {
    try {
      const last = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const channels = msg.guild.channels.cache.filter(c => (c.type == "text" && c.permissionsFor(msg.client.user).has("VIEW_CHANNEL") && (c.parentID != "363019058158895117")));
      const fetch = channels.map(c => c.message.fetch({limit: 100}));
      const stats = new u.Collection(channels.map(c => ([c.id, {id: c.id, name: c.name, messages: 0}])));

      const channelMsgs = await Promise.all(fetch);

      for (let messages of channelMsgs) {
        messages = messages.filter(m => m.createdTimestamp > last);
        if (messages.size > 0)
          stats.get(messages.first().channel.id).messages = messages.size;
      }
      msg.channel.send(
        stats
        .filter(c => c.messages < 25)
        .sort((a, b) => b.messages - a.messages)
        .map(channel => `<#${channel.id}>: ${channel.messages}`)
        .join("\n"),
        {split: true}
      );
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "filter",
  description: "Add a word to the language filter",
  category: "Mod",
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.management) || msg.member.roles.cache.has("205826273639923722"))),
  process: (msg, suffix) => {
    u.clean(msg, 0);
    suffix = suffix.toLowerCase().trim();
    if (pf.add_word(suffix)) {
      msg.client.channels.cache.get(modLogs).send(`ℹ️ **${msg.member.displayName}** has added "${suffix}" to the language filter.`);
    }
  }
})
.addCommand({name: "infractionsummary",
  syntax: "<@user> [days]",
  description: "View a summary of a user's infractions",
  category: "Mod",
  aliases: ["warnsummary", "warningsummary"],
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    const guild = msg.guild;
    const time = parseInt(suffix.replace(/<@!?\d+>/ig, '').trim(), 10) || 28;
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      for (const [memberId, member] of members) {
        try {
          let data = await Module.db.infraction.getSummary(member.id, time);
          let response = [`**${u.escapeText(member.displayName)}** has had **${data.count}** infraction(s) in the last **${data.time}** day(s), totaling **${data.points}** points.`];

          if ((data.count > 0) && (data.detail.length > 0)) {
            for (let record of data.detail) {
              let mod = guild.members.cache.get(record.mod) || ({displayName: "Unknown Mod"});
              response.push(`${record.timestamp.toLocaleDateString()} (${record.value} pts, modded by ${mod.displayName}): ${record.description}`);
            }
          }
          msg.channel.send(response.join("\n"), {split: true});
        } catch(e) { u.errorHandler(e, m); }
      }
    } else msg.reply("you need to tell me whose summary to view!").then(u.clean);
  }
})
.addCommand({name: "kick",
  syntax: "<@user(s)> [reason]",
  description: "Kick a user from the server.",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.member.hasPermission("KICK_MEMBERS") || msg.member.roles.cache.has(Module.config.roles.mod))),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    const members = u.userMentions(msg, true);
    if (members.size > 0) {
      let reason = suffix.replace(/<@!?\d+>/ig, "").trim() || "[Member Kick] Violating the Code of Conduct";
      let guild = msg.guild;
      // Get highest role that isn't "Live"
      const kickerHighRole = msg.member.roles.cache.filter(r => r.id != "281135201407467520").sort((a, b) => b.comparePositionTo(a)).first();
      for (const [memberId, member] of members) {
        try {
          // Make sure kicker's highest role is higher than kick-ee's highest role
          const kickedHighRole = member.roles.cache.filter(r => r.id != "281135201407467520").sort((a, b) => b.comparePositionTo(a)).first();
          if (kickerHighRole.comparePositionTo(kickedHighRole) <= 0) {
            msg.reply(`you can't kick ${member}!`).then(u.clean);
            continue;
          }
          let infraction = {
            discordId: member.id,
            description: reason,
            value: 20,
            mod: msg.author.id
          };
          let inf = await Module.db.infraction.save(infraction);

          await member.send(`You were kicked from ${guild.name} for ${reason}`).catch(() => blocked(member));
          await member.kick(reason);
          msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** kicked **${u.escapeText(member.displayName)}** for ${reason}`);

          let memberDoc = await Module.db.user.fetchUser(userId);
          memberDoc.roles = memberDoc.roles.filter(r => r != Module.config.roles.trusted).concat(Module.config.roles.muted, Module.config.roles.untrusted);
          await Module.db.user.update(userId, {roles: memberDoc.roles});
        } catch(e) { u.errorHandler(e, msg); }
      }
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
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: (msg) => {
    u.clean(msg, 0);
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      for (const [memberId, member] of u.userMentions(msg, true)) {
        try {
          member.roles.add("253214700446285825");
          msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** added **${u.escapeText(member.displayName)}** to the LDSG Lady group.`);
        } catch(error) { u.errorHandler(error, msg); }
      }
    } else msg.reply("you need to tell me who to apply the role to!").then(u.clean);
  }
})
.addCommand({name: "mute",
  syntax: "<@user> [time]",
  description: "Mute a user.",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    let duration = parseInt(suffix.replace(/<@!?\d+>/ig, '').toLowerCase().trim(), 10);
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      for (const [memberId, member] of members) {
        try {
          if (member && !member.roles.cache.has(Module.config.roles.muted)) {
            await member.roles.add(Module.config.roles.muted);
            if (member.voice.channel) {
              await member.voice.kick("User mute");
            }

            msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** muted **${u.escapeText(member.displayName)}**${(duration ? " for " + duration + " minutes." : "")}`);
            msg.client.channels.cache.get("356657507197779968").send(`${member}, you have been muted in ${msg.guild.name}. Please review our Code of Conduct. A member of the management team will be available to discuss more details.\n\nhttp://ldsgamers.com/code-of-conduct`);

              if (duration) {
                if (mutes.has(memberId)) clearTimeout(mutes.get(memberId));

                mutes.set(memberId,
                  setTimeout(async (member, duration) => {
                    try {
                      await member.roles.remove(Module.config.roles.muted);
                      msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(member.displayName)}** has automatically been unmuted after ${timeout} minutes.`);
                    } catch(error) { u.errorHandler(error, "Unmute Timeout"); }
                  }, (duration * 60000), member, duration)
                );
              }
            }
          } catch(e) { u.errorHandler(e, msg); }
        }
    } else msg.reply("you need to tell me who to mute!").then(u.clean);
  }
})
.addCommand({name: "note",
  syntax: "<@user> <message>",
  description: "Record a mod note",
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    let comment = suffix.replace(/<@!?\d+>/ig, '').replace(/\s\s+/g, ' ').trim();
    if (comment) {
      for (const [memberId, member] of u.userMentions(msg, true)) {
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

          let embed = u.embed()
          .setColor("#0000FF")
          .setAuthor(u.escapeText(member.displayName), member.user.displayAvatarURL())
          .setDescription(comment)
          .addField("Resolved", `${msg.author.username} added a note.`)
          .addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count}\nPoints: ${summary.points}`)
          .setTimestamp();

          msg.client.channels.cache.get(modLogs).send({embed});
        } catch(e) { u.errorHandler(e, msg); }
      }
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
      let purge = parseInt(suffix, 10) || 0;
      let num = purge + 1;
      let channel = msg.channel;
      if (num > 0) {
        while (num > 0) {
          let deleting = Math.min(num, 50)
          await channel.bulkDelete(deleting);
          num -= deleting;
        }
        msg.guild.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** purged ${purge} messages in ${msg.channel}`);
      } else {
        msg.reply("you need to tell me how many to delete.")
          .then(u.clean);
      }
    } catch(e) { u.errorHandler(e, msg); }
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
    const {names, colors, adjectives} = require("../data/nameParts.json");
    for (const [memberId, member] of u.userMentions(msg, true)) {
      try {
        let oldNick = member.displayName;
        let newNick = setNick;

        while (!newNick || newNick.length > 32) {
          newNick = u.rand(adjectives) + " " + u.rand(colors) + " " + u.rand(names);
        }

        await member.setNickname(newNick)

        let comment = `Set nickname to ${newNick} from ${oldNick}.`;

        let inf = await Module.db.infraction.save({
          discordId: member.id,
          value: 0,
          description: comment,
          message: msg.id,
          channel: msg.channel.id,
          mod: msg.author.id
        });
        let summary = await Module.db.infraction.getSummary(member.id);

        let embed = u.embed()
          .setColor("#0000FF")
          .setAuthor(u.escapeText(member.displayName), member.user.displayAvatarURL())
          .setDescription(comment)
          .addField("Resolved", `${msg.author.username} changed the user's nickname from ${oldNick} to ${newNick}.`)
          .addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count}\nPoints: ${summary.points}`)
          .setTimestamp();

        msg.client.channels.cache.get(modLogs).send({embed});
        member.send(`Your nickname has been changed in ${msg.guild.name} from ${oldNick} to ${newNick}. Please contact a moderator or member of the management team if you have questions regarding the change.`).catch(() => blocked(member));
      } catch(e) { u.errorHandler(e, msg); }
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
    let members = u.userMentions(msg, true);
    if (members && members.size > 0) {
      let swagoteer = "441267815622639616";
      for (const [memberId, member] of members) {
        if (member.roles.cache.has(swagoteer)) {
          member.send("Thanks for your purchase from LDSG!").catch(() => blocked(member));
        } else {
          await member.roles.add(swagoteer);
          member.send("Thanks for your purchase from LDSG! You've been awarded the **Swagoteer** role!").catch(() => blocked(m));
        }
      }
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
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg) => {
    u.clean(msg, 0);
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      for (const [memberId, member] of members) {
        try {
          await member.roles.add(Module.config.roles.trusted);
          if (member.roles.cache.has(Module.config.roles.untrusted))
            await member.roles.remove(Module.config.roles.untrusted);
          member.send("You have been marked as \"Trusted\" in " + msg.guild.name + ". This means you are now permitted to post images and links in chat. Please remember to follow the Code of Conduct when doing so.\n<http://ldsgamers.com/code-of-conduct>").catch(() => blocked(member));
          msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** trusted **${u.escapeText(member.displayName)}**`);
        } catch(error) { u.errorHandler(error, msg); }
      }
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
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    try {
      let threshold = parseInt(suffix, 10) || 15;
      const guild = msg.guild;
      let users = await Module.db.user.getUsers({posts: {$gt: threshold}});
      let response = [];
      for (const user of users) {
        let member = ldsg.members.cache.get(user.discordId);
        if (member && !member.roles.cache.has(Module.config.roles.trusted) & !member.roles.cache.has(Module.config.roles.untrusted)) {
          response.push({member: member, posts: user.posts});
        }
      }
      if (response.length > 0)
        msg.channel.send(response.sort((a, b) => b.posts - a.posts).map(m => `${m.member}: ${m.posts} posts, joined ${m.member.joinedAt.toLocaleDateString()}`).join("\n"), {split: true});
      else msg.channel.send(`No untrusted users with ${threshold}+ posts found.`);
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "unfilter",
  description: "Remove a word from the language filter",
  category: "Mod",
  hidden: true,
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.cache.has(Module.config.roles.management) || msg.member.roles.cache.has("205826273639923722"))),
  process: (msg, suffix) => {
    suffix = suffix.toLowerCase().trim();
    if (pf.remove_word(suffix)) {
      msg.react("👌");
      msg.client.channels.cache.get(modLogs).send(`ℹ️ **${msg.member.displayName}** has removed "${suffix}" from the language filter.`);
    }
  }
})
.addCommand({name: "unmute",
  syntax: "<@user>",
  description: "Unmute a user", hidden: true,
  category: "Mod",
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg) => {
    u.clean(msg, 0);
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      for (const [memberId, member] of members) {
        try {
          if (mutes.has(memberId)) {
            clearTimeout(mutes.get(memberId));
            mutes.delete(memberId);
          }
          member.roles.remove(Module.config.roles.muted);
          msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** unmuted **${u.escapeText(member.displayName)}**`);
        } catch(error) { u.errorHandler(error, msg); }
      }
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
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg) => {
    u.clean(msg, 0);
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      for (const [memberId, member] of members) {
        try {
          await member.roles.remove(Module.config.roles.trusted);
          await member.roles.add(Module.config.roles.untrusted);
          member.send("You have been removed from \"Trusted\" in " + msg.guild.name + ". This means you no longer have the ability to post images. Please remember to follow the Code of Conduct when posting images or links.\n<http://ldsgamers.com/code-of-conduct>").catch(() => blocked(member));

          msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** untrusted **${u.escapeText(member.displayName)}**`);
        } catch(error) { u.errorHandler(error, msg); }
      }
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
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      let comment = suffix.replace(/<@!?\d+>/ig, '').replace(/\s\s+/g, ' ').trim();
      let value = comment.substring(0, comment.indexOf(" "));

      if (value.toLowerCase().startsWith("min")) value = 1;
      else if (value.toLowerCase().startsWith("mod") || value.toLowerCase().startsWith("med")) value = 8;
      else if (value.toLowerCase().startsWith("maj")) value = 15;
      else value = parseInt(value, 10);

      if (Number.isInteger(value)) comment = comment.substr(comment.indexOf(" ")+1);
      else value = 1;

      for (const [memberId, member] of members) {
        try {
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
          member.send(`${response}\n\n**${msg.member.displayName}** has issued you a warning for:\n${comment}`).catch(() => blocked(member));

          let embed = u.embed()
            .setColor("#0000FF")
            .setAuthor(u.escapeText(member.displayName), member.user.displayAvatarURL())
            .setDescription(comment)
            .addField("Resolved", `${msg.author.username} issued a ${value} point warning.`)
            .addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count}\nPoints: ${summary.points}`)
            .setTimestamp();

          msg.client.channels.cache.get(modLogs).send({embed});
        } catch(e) { u.errorHandler(e, msg); }
      }
    } else msg.reply("you need to tell me who and what the infraction is.").then(u.clean);
  }
});

/*************
**  Events  **
*************/
Module
.addEvent("channelCreate", (channel) => {
  if (channel.guild && (channel.guild.id == Module.config.ldsg)) {
    let muted = channel.guild.roles.cache.get(Module.config.roles.muted);
    channel.createOverwrite(muted, {
      VIEW_CHANNEL: false,
      CONNECT: false,
      SEND_MESSAGES: false,
      SPEAK: false
    }).catch(e => u.errorHandler(e, "Update new channel permissions."));
  }
})
.addEvent("guildBanAdd", (guild, user) => {
  if ((guild.id == Module.config.ldsg) && !bans.has(user.id)) guild.client.channels.cache.get(modLogs).send(`**${user.username}** has been banned.`);
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
  } catch(e) { u.errorHandler(e, "Card Reaction Processing"); }
})
.addEvent("messageUpdate", (old, msg) => {
  if (msg.guild && msg.member && msg.guild.id == Module.config.ldsg) return processMessageLanguage(msg, true);
})
.addEvent("userUpdate", (oldUser, newUser) => {
  let ldsg = newUser.client.guilds.cache.get(Module.config.ldsg);
  if (ldsg.members.cache.has(newUser.id)) {
    let newMember = ldsg.members.cache.get(newUser.id);
    if (!newMember.roles.cache.has(Module.config.roles.trusted) || newMember.roles.cache.has(Module.config.roles.untrusted)) {
      const embed = u.embed()
        .setTimestamp()
        .setAuthor(oldUser.username, oldUser.displayAvatarURL())
        .setTitle("User Update");
      if (oldUser.tag != newUser.tag) {
        embed.addField("**Username Update**", `**Old:** ${oldUser.tag}\n**New:** ${newUser.tag}`);
      }
      if (oldUser.avatar != newUser.avatar) {
        embed.addField("**Avatar Update**", "See Below").setImage(newUser.displayAvatarURL());
      } else {
        embed.setThumbnail(newUser.displayAvatarURL());
      }
      ldsg.channels.cache.get("725797487129919488").send({embed});
    }
  }
});

module.exports = Module;
