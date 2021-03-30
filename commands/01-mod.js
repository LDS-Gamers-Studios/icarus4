const Augur = require("augurbot"),
  profanityFilter = require("profanity-matcher"),
  u = require("../utils/utils"),
  {USet} = require("../utils/tools"),
  modLogs = "506575671242260490";

const pf = new profanityFilter();
const mutes = new u.Collection();

function blocked(member) {
  return member.client.channels.cache.get(modLogs).send(`I think ${member} has me blocked. *sadface*`);
}

function isMod(msg) {
  return msg.member?.roles.cache.has(Module.config.roles.mod) || msg.member?.roles.cache.has(Module.config.roles.management);
}

function canManage(msg) {
  return (msg.member?.roles.cache.has(Module.config.roles.management) || msg.member?.roles.cache.has("205826273639923722") || Module.config.adminId.includes(msg.member?.id));
}

/*******************
**  Mod Commands  **
*******************/
const Module = new Augur.Module()
.addCommand({name: "ankles",
  description: "View lost ankles",
  category: "Mod",
  permissions: isMod,
  process: async (msg, suffix) => {
    try {
      let time = parseInt(suffix.replace(/<@!?\d+>/ig, '').replace(msg.mentions.CHANNELS_PATTERN, '').trim(), 10) || 10000;
      let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));

      let userMentions = u.userMentions(msg, true);
      let channelMentions = msg.mentions.channels;
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
            msg.channel.send(u.escapeText(member.displayName) + " still has all their ankles!");
          }
        } catch (e) { u.errorHandler(e, `Handling lost ankles for user: ${u.escapeText(member.displayName)}`); }
      }
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

            for (const [discordId, count] of data.perUser) {
              let user = msg.guild.members.cache.get(discordId) || await msg.client.users.fetch(discordId);
              response.push(`${u.escapeText(user.displayName || user.username)}: ${count} ankles lost.`);
            }
            await msg.channel.send(response.join("\n") + "```");
          } else {
            msg.channel.send(`No users have lost any ankles in ${channel}!`);
          }
        } catch (e) { u.errorHandler(e, `Handling lost ankles for channel: ${channel.name}`); }
      }
      if (userMentions.size == 0 && channelMentions.size == 0) { // No user or channel mentions, give high summary
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
          for (const [discordId, count] of data.perUser) {
            response.push(`${u.escapeText(msg.guild.members.cache.get(discordId).displayName)}: ${count} ankles lost.`);
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
  permissions: canManage,
  process: async (msg, suffix) => {
    if (suffix) {
      try {
        let message = await msg.channel.messages.fetch(suffix);
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
  permissions: (msg) => (msg.member?.hasPermission("BAN_MEMBERS") || msg.member?.roles.cache.has(Module.config.roles.mod)),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    const bannerHighRole = msg.member.roles.cache.filter(r => r.id != "281135201407467520").sort((a, b) => b.comparePositionTo(a)).first();
    const mentions = /<@!?(\d+)>/ig;
    const reason = suffix.replace(mentions, "").trim() || "[Member Ban]: Violating the Code of Conduct";

    let members = new u.Collection();
    let match;
    while (match = mentions.exec(suffix)) {
      userId = match[1];
      try {
        let member = await msg.guild.members.fetch(userId);
        if (member) {
          const bannedHighRole = member.roles.cache.filter(r => r.id != "281135201407467520").sort((a, b) => b.comparePositionTo(a)).first();
          if (bannerHighRole.comparePositionTo(bannedHighRole) <= 0) {
            msg.reply(`you cannot ban ${u.escapeText(member.displayName)}!`);
            continue;
          }
          members.set(userId, member);
        }
        else {
          members.set(userId, undefined);
        }
      }
    }
    if (members.size == 0) {
      msg.reply("you need to tell me who to ban!").then(u.clean);
      return;
    }

    let confirm = await u.confirm(msg, `Are you sure you want to ban the following?\n${members.keyArray().map(m => members.get(m) ? u.escapeText(members.get(m).displayName) : m).join("\n")}`);

    if (confirm) {
      let banCount = 0;
      for (const [memberId, member] of members) {
        try {
          if (member) {
            const infraction = {
              discordId: member.id,
              description: reason,
              value: 30,
              mod: msg.author.id
            };
            let inf = await Module.db.infraction.save(infraction);

            await (member.send(`You were banned from ${msg.guild.name} for ${reason}`).catch(() => blocked(member)));
            if (!msg.client.ignoreNotifications) msg.client.ignoreNotifications = new Set();
            msg.client.ignoreNotifications.add(member.id);
            await member.ban({days: 2, reason});

            let embed = u.embed()
              .setAuthor(member.displayName, member.user.displayAvatarURL({dynamic: true}))
              .setTitle(`User Ban`)
              .setDescription(`**${u.escapeText(msg.member.displayName)}** banned **${u.escapeText(member.displayName)}** for ${reason}.`)
              .setColor(0x0000FF);

            msg.client.channels.cache.get(modLogs).send({embed});
          } else {
            msg.guild.members.ban(memberId, {days: 2, reason});
          }

          let memberDoc = await Module.db.user.fetchUser(userId);
          if (memberDoc) {
            memberDoc.roles = memberDoc.roles.filter(r => r != Module.config.roles.trusted).concat(Module.config.roles.muted, Module.config.roles.untrusted);
            await Module.db.user.update(userId, {roles: memberDoc.roles});
          }
          banCount++;
        } catch (e) { u.errorHandler(e, msg); }
      }
      if (banCount > 0)
        msg.reply(`${banCount} user(s) banned.`).then(u.clean);
    } else {
      msg.reply("`!ban` cancelled.").then(u.clean);
    }

  }
})
.addCommand({name: "channelactivity",
  description: "See how active a channel has been over the last two weeks",
  category: "Mod",
  permissions: canManage,
  process: async (msg) => {
    try {
      const last = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const channels = msg.guild.channels.cache.filter(c => (c.type == "text" && c.permissionsFor(msg.client.user).has("VIEW_CHANNEL") && (c.parentID != "363019058158895117")));
      const fetch = channels.map(c => c.messages.fetch({limit: 100}));
      const stats = new u.Collection(channels.map(c => ([c.id, {channel: c, messages: 0}])));
      const channelMsgs = await Promise.all(fetch);

      for (let messages of channelMsgs) {
        messages = messages.filter(m => m.createdTimestamp > last);
        if (messages.size > 0) {
          let channel = messages.first().channel;
          stats.get(channel.id).messages = messages.size;
        }
      }

      let categories = msg.guild.channels.cache.filter(c => c.type == "category").sort((a, b) => a.position - b.position);
      let response = "";
      for (const [categoryId, category] of categories) {
        let categoryStats = stats.filter(c => c.channel.parentID == categoryId && c.messages < 25).sort((a, b) => a.channel.position - b.channel.position);
        if (categoryStats.size > 0) {
          response += `__**${category.name}**__\n${categoryStats.map(c => `<#${c.channel.id}>: ${c.messages}`).join("\n")}\n\n`
        }
      }

      msg.channel.send(
        response,
        {split: true}
      );
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "filter",
  description: "Add a word to the language filter",
  category: "Mod",
  hidden: true,
  permissions: canManage,
  process: (msg, suffix) => {
    u.clean(msg, 0);
    suffix = suffix.toLowerCase().trim();
    if (pf.add_word(suffix)) {
      msg.client.channels.cache.get(modLogs).send(`ℹ️ **${msg.member.displayName}** has added "${suffix}" to the language filter.`);
    }
  }
})
.addCommand({name: "fullinfo",
  description: "Check when a user joined the server and rank information",
  syntax: "[@user]",
  category: "Mod",
  hidden: true,
  permissions: isMod,
  process: async (msg, suffix) => {
    try {
      let member = await u.getMention(msg);
      if (member) {
        let roleString = member.roles.cache.sort((a, b) => b.comparePositionTo(a)).map(role => role.name).join(", ");
        if (roleString.length > 1024) roleString = roleString.substr(0, roleString.indexOf(", ", 1000)) + " ...";

        let userDoc = await Module.db.user.fetchUser(member.id);
        let infractionSummary = await Module.db.infraction.getSummary(member.id, 90);

        let infractionDescription = [`**${u.escapeText(member.displayName)}** has had **${infractionSummary.count}** infraction(s) in the last **${infractionSummary.time}** days, totalling **${infractionSummary.points}** points.`];
        for (let record of infractionSummary.detail) {
          let recordMod = message.guild.members.cache.get(record.mod);
          infractionDescription.push(`${record.timestamp.toLocaleDateString()} (${record.value}) pts, modded by ${recordMod?.displayName}): ${record.description}`);
        }

        infractionDescription = infractionDescription.join("\n");
        if (infractionDescription.length > 2048) infractionDescription = infractionDescription.substr(0, infractionDescription.indexOf("\n", 1950)) + "\n...";

        let embed = u.embed()
        .setTimestamp()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
        .setDescription(infractionDescription)
        .addField("ID", member.id, true)
        .addField("Activity", `Posts: ${parseInt(userDoc.posts, 10).toLocaleString()}`, true)
        .addField("Roles", roleString)
        .addField("Joined", member.joinedAt.toUTCString(), true)
        .addField("Account Created", member.user.createdAt.toUTCString(), true);

        msg.channel.send({embed, disableEveryone: true});
      } else {
        msg.reply(`I couldn't find the member \`${suffix}\`. `).then(u.clean);
        return;
      }
    } catch(error) {
      u.errorHandler(error, msg);
    }
  }
})
.addCommand({name: "infractionsummary",
  syntax: "<@user> [days]",
  description: "View a summary of a user's infractions",
  category: "Mod",
  aliases: ["warnsummary", "warningsummary"],
  hidden: true,
  permissions: isMod,
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
  permissions: (msg) => (msg.member?.hasPermission("KICK_MEMBERS") || msg.member?.roles.cache.has(Module.config.roles.mod)),
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    const members = u.userMentions(msg, true);

    if (members.size > 0) {
      // Get highest role that isn't "Live"
      const kickerHighRole = msg.member.roles.cache.filter(r => r.id != "281135201407467520").sort((a, b) => b.comparePositionTo(a)).first();
      for (const [memberId, member] of members) {
        try {
          // Make sure kicker's highest role is higher than kick-ee's highest role
          const kickedHighRole = member.roles.cache.filter(r => r.id != "281135201407467520").sort((a, b) => b.comparePositionTo(a)).first();
          if (kickerHighRole.comparePositionTo(kickedHighRole) <= 0) {
            members.delete(memberId);
            msg.reply(`you can't kick ${member}!`).then(u.clean);
          }
        } catch(e) { u.errorHandler(e, msg); }
      }
    } else {
      msg.reply("you need to tell me who to kick!").then(u.clean);
    }
    if (members.size == 0) return;

    let confirm = await u.confirm(msg, `Are you sure you want to kick the following?\n${members.map(m => u.escapeText(m.displayName)).join("\n")}`);

    if (confirm) {
      const reason = suffix.replace(/<@!?\d+>/ig, "").trim() || "[Member Kick] Violating the Code of Conduct";
      for (const [memberId, member] of members) {
        try {
          let infraction = {
            discordId: member.id,
            description: reason,
            value: 20,
            mod: msg.author.id
          };
          let inf = await Module.db.infraction.save(infraction);

          await member.send(`You were kicked from ${msg.guild.name} for ${reason}`).catch(() => blocked(member));
          await member.kick(reason);
          msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** kicked **${u.escapeText(member.displayName)}** for ${reason}`);

          let memberDoc = await Module.db.user.fetchUser(memberId);
          if (memberDoc) {
            memberDoc.roles = memberDoc.roles.filter(r => r != Module.config.roles.trusted).concat(Module.config.roles.muted, Module.config.roles.untrusted);
            await Module.db.user.update(memberId, {roles: memberDoc.roles});
          }
        } catch(e) { u.errorHandler(e, msg); }
      }
    } else {
      msg.reply("`!kick` cancelled.").then(u.clean);
    }
  }
})
.addCommand({name: "lady",
  syntax: "<@user>",
  description: "Note an LDSG Lady",
  category: "Mod",
  hidden: true,
  permissions: isMod,
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
  permissions: isMod,
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
  permissions: isMod,
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
          .setAuthor(member.displayName, member.user.displayAvatarURL())
          .setDescription(comment)
          .addField("Resolved", `${u.escapeText(msg.author.username)} added a note.`)
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
.addCommand({name: "office",
  syntax: "<@user> [time]",
  description: "Send a user to Ghost's office.",
  category: "Mod",
  permissions: isMod,
  process: async (msg, suffix) => {
    u.clean(msg, 0);
    let duration = parseInt(suffix.replace(/<@!?\d+>/ig, '').toLowerCase().trim(), 10);
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      for (const [memberId, member] of members) {
        try {
          if (member && !member.roles.cache.has("771516264618262607")) {
            await member.roles.add("771516264618262607");
            if (member.voice.channel) {
              await member.voice.kick("User sent to office");
            }

            msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** sent **${u.escapeText(member.displayName)}** to the office${(duration ? " for " + duration + " minutes." : "")}`);
            msg.client.channels.cache.get("771515647808372777").send(`${member}, you have been muted in ${msg.guild.name}. Please review our Code of Conduct. A member of the management team will be available to discuss more details.\n\nhttp://ldsgamers.com/code-of-conduct`);

              if (duration) {
                if (mutes.has(memberId)) clearTimeout(mutes.get(memberId));

                mutes.set(memberId,
                  setTimeout(async (member, duration) => {
                    try {
                      await member.roles.remove("771516264618262607");
                      msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(member.displayName)}** has automatically been let out of the office after ${timeout} minutes.`);
                    } catch(error) { u.errorHandler(error, "Office Timeout"); }
                  }, (duration * 60000), member, duration)
                );
              }
            }
          } catch(e) { u.errorHandler(e, msg); }
        }
    } else msg.reply("you need to tell me who to send to the office!").then(u.clean);
  }
})
.addCommand({name: "playground",
  syntax: "<@user>",
  description: "Let someone out of the office.", hidden: true,
  category: "Mod",
  permissions: isMod,
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
          member.roles.remove("771516264618262607");
          msg.client.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** let **${u.escapeText(member.displayName)}** out of the office.`);
        } catch(error) { u.errorHandler(error, msg); }
      }
    } else {
      msg.reply("you need to tell me which users to let out of the office!")
        .then(u.clean);
    }
  }
})
.addCommand({name: "purge",
  syntax: "<number of messages>",
  description: "Delete a number of messages",
  category: "Mod",
  permissions: (msg) => msg.guild && msg.channel.permissionsFor(msg.author)?.has("MANAGE_MESSAGES"),
  process: async (msg, suffix) => {
    try {
      let purge = parseInt(suffix, 10) || 0;
      let num = purge + 1;
      let channel = msg.channel;
      if (num > 1) {
        while (num > 0) {
          let deleting = Math.min(num, 50)
          deleted = await channel.bulkDelete(deleting, true);
          num -= deleted.size;
          if (deleted.size != deleting)
          break;
        }
        let delay = 0;
        while (num > 0) {
          let fetching = Math.min(num, 50);
          let msgsToDelete = await channel.messages.fetch({limit: fetching, before: msg.id}).catch(u.noop);
          if (!msgsToDelete) break;
          for (let [id, deleteMe] of msgsToDelete) {
            deleteMe.delete({timeout: (delay++) * 1200}).catch(u.noop);
          }
          num -= msgsToDelete.size;
          if (msgsToDelete.size != fetching)
          break;
        }
        msg.guild.channels.cache.get(modLogs).send(`ℹ️ **${u.escapeText(msg.member.displayName)}** purged ${purge - num} messages in ${msg.channel}`);
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
  permissions: isMod,
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

        let comment = `Set nickname to ${u.escapeText(newNick)} from ${u.escapeText(oldNick)}.`;

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
          .addField("Resolved", `${u.escapeText(msg.author.username)} changed the user's nickname from ${u.escapeText(oldNick)} to ${u.escapeText(newNick)}.`)
          .addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count}\nPoints: ${summary.points}`)
          .setTimestamp();

        msg.client.channels.cache.get(modLogs).send({embed});
        member.send(`Your nickname has been changed in ${msg.guild.name} from ${u.escapeText(oldNick)} to ${u.escapeText(newNick)}. Please contact a moderator or member of the management team if you have questions regarding the change.`).catch(() => blocked(member));
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
      msg.reply(`I added the *Swagoteer* role to ${members.map(m => u.escapeText(m.displayName)).join(", ")}`)
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
  permissions: isMod,
  process: async (msg) => {
    u.clean(msg, 0);
    let members = u.userMentions(msg, true);
    if (members.size > 0) {
      for (const [memberId, member] of members) {
        try {
          await member.roles.add(Module.config.roles.trusted);
          if (member.roles.cache.has(Module.config.roles.untrusted))
            await member.roles.remove(Module.config.roles.untrusted);
          member.send("You have been marked as \"Trusted\" in " + msg.guild.name + ". This means you are now permitted to post images and links in chat. Please remember to follow the Code of Conduct when doing so.\n<http://ldsgamers.com/code-of-conduct>\n\nIf you'd like to join one of our in-server Houses, you can visit <http://3houses.live> to get started!").catch(() => blocked(member));
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
  description: "List semi-active (100 posts or more) untrusted users",
  category: "Mod",
  hidden: true,
  permissions: isMod,
  process: async (msg, suffix) => {
    try {
      let threshold = parseInt(suffix, 10) || 100;
      const members = msg.guild.members.cache;
      const pool = members.filter(member => ((Date.now() - member.joinedTimestamp) > (7 * 24 * 60 * 60000)) && !member.roles.cache.has(Module.config.roles.trusted) && !member.roles.cache.has(Module.config.roles.untrusted));
      let users = await Module.db.user.getUsers({posts: {$gt: threshold}, discordId: {$in: pool.map(m => m.id)}});
      let response = users.map(user => ({
        member: members.get(user.discordId),
        posts: user.posts
      }));
      if (response.length > 0)
        msg.channel.send(response.sort((a, b) => b.posts - a.posts).map(m => `${m.member}: ${m.posts} posts, joined ${m.member.joinedAt.toLocaleDateString()}`).join("\n"), {split: true});
      else msg.channel.send(`No untrusted users who have been in the server longer than a week with ${threshold}+ posts found.`);
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "unfilter",
  description: "Remove a word from the language filter",
  category: "Mod",
  hidden: true,
  permissions: canManage,
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
  permissions: isMod,
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
  permissions: isMod,
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
  permissions: isMod,
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
          let response = "We have received one or more complaints regarding content you posted. We have reviewed the content in question and have determined, in our sole discretion, that it is against our code of conduct (<http://ldsgamers.com/code-of-conduct>). This content was removed on your behalf. As a reminder, if we believe that you are frequently in breach of our code of conduct or are otherwise acting inconsistently with the letter or spirit of the code, we may limit, suspend or terminate your access to the LDSG discord server.";
          member.send(`${response}\n\n**${u.escapeText(msg.member.displayName)}** has issued you a warning for:\n${comment}`).catch(() => blocked(member));

          let embed = u.embed()
            .setColor("#0000FF")
            .setAuthor(member.displayName, member.user.displayAvatarURL())
            .setDescription(comment)
            .addField("Resolved", `${u.escapeText(msg.author.username)} issued a ${value} point warning.`)
            .setTimestamp();
          let flag = await msg.client.channels.cache.get(modLogs).send({embed});

          let inf = await Module.db.infraction.save({
            discordId: member.id,
            value: value,
            description: comment,
            message: msg.id,
            flag: flag.id,
            channel: msg.channel.id,
            mod: msg.author.id
          });

          let summary = await Module.db.infraction.getSummary(member.id);
          embed.addField(`Infraction Summary (${summary.time} Days) `, `Infractions: ${summary.count}\nPoints: ${summary.points}`);

          flag.edit({embed});
        } catch(e) { u.errorHandler(e, msg); }
      }
    } else msg.reply("you need to tell me who and what the infraction is.").then(u.clean);
  }
});

module.exports = Module;
