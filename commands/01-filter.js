const Augur = require("augurbot"),
  banned = require("../data/banned.json"),
  profanityFilter = require("profanity-matcher"),
  u = require("../utils/utils");

const bannedWords = new RegExp(banned.words.join("|"), "i"),
  bannedLinks = new RegExp(`\\b(${banned.links.join("|").replace(".", "\.")})`, "i"),
  hasLink = /http(s)?:\/\/(\w+(-\w+)*\.)+\w+/,
  modLogs = "506575671242260490",
  pf = new profanityFilter(),
	scamLinks = new RegExp(`\\b(${banned.scam.join("|").replace(".", "\.")})`, "i");

const grownups = new Map();

function blocked(member) {
  return member.client.channels.cache.get(modLogs).send(`I think ${member} has me blocked. *sadface*`);
}

const cardReactions = ["👤", "✅", "🗣", "⚠", "⛔", "🔇"];

function filter(msg, text) {
  // PROFANITY FILTER
  let noWhiteSpace = text.toLowerCase().replace(/[\.,\/#!$%\^&\*;:\{\}=\-_`~"'\(\)\?\|]/g,"").replace(/\s\s+/g, " ");
  let filtered = pf.scan(noWhiteSpace);
  if ((filtered.length > 0) && (noWhiteSpace.length > 0)) {
    warnCard(msg, filtered);
    return true;
  } else return false;
}

function processMessageLanguage(old, msg) {
  if (!msg) msg = old;
  if (msg.guild?.id != Module.config.ldsg) return false;
  if (grownups.has(msg.channel.id)) return false;

  if (msg.author.id != msg.client.user.id) {
    processDiscordInvites(msg);

    let match = null;
    let link = null;
    // LINK FILTER
    if (link = hasLink.exec(msg.cleanContent)) {
      if (match = bannedLinks.exec(msg.cleanContent)) {
        // Porn links
        warnCard(msg, match, true);
        return true;
      } else if (match = scamLinks.test(msg.cleanContent)) {
        // Scam links
        u.clean(msg, 0);
        msg.reply("that link is generally believed to be to a scam/phishing site. Please be careful!");
        warnCard(msg, ["Suspected scam links (Auto-Removed)"].concat(match));
        return true;
      } else if ((match = bannedWords.exec(msg.cleanContent)) && (link[0].toLowerCase().includes("tenor") || link[0].toLowerCase().includes("giphy"))) {
        u.clean(msg, 0);
        msg.reply("it looks like that link might have had some harsh language. Please be careful!").then(u.clean);
        warnCard(msg, ["Link Language (Auto-Removed)"].concat(match));
        return true;
      } else if (!msg.webhookID && !msg.author.bot && !msg.member.roles.cache.has(Module.config.roles.trusted)) {
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

    if (msg.embeds?.length > 0) {
      for (let embed of msg.embeds) {
        let preview = [embed.author?.name || "", embed.title, embed.description].join("\n");
        let match;
        if (match = bannedWords.exec(preview)) {
          msg.reply("it looks like that link might have some harsh language in the preview. Please be careful!").then(u.clean);
          warnCard(msg, ["Link preview language (Auto-Removed)"].concat(match));
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
    .setAuthor(msg.member?.displayName || msg.author?.username, msg.author.displayAvatarURL({dynamic: true}))
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

    embed.addField("Channel", msg.channel?.toString(), true)
    .addField("Jump to Post", `[Original Message](${msg.url})`, true)
    .setTimestamp((msg.editedAt ? msg.editedAt : msg.createdAt));

    // Minecraft Filter
    if (msg.channel.id == "121033996439257092")
      msg.client.channels.cache.get('114490357474918401').send({embed});

    embed.addField(`Infraction Summary (${infractionSummary.time} Days)`, `Infractions: ${infractionSummary.count}\nPoints: ${infractionSummary.points}`)

    if (msg.author.bot)
      embed.setFooter("The user is a bot and the flag likely originated elsewhere. No reactions will be processed.");

    let card = await msg.client.channels.cache.get(modLogs).send({embed});

    if (call) {
      u.clean(msg, 0);

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

      for (let emoji of cardReactions.concat("🔗")) {
        await card.react(emoji);
      }
    }
  } catch(e) { u.errorHandler(e, "Mod Card Creation"); }
}

async function processCardReaction(reaction, mod, infraction) {
  try {
    if (reaction.users.cache.filter(u => !u.bot).size > 1) return;
    let react = reaction;
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
        embed.fields.find(f => f.name.startsWith("Infraction Summary")).value = `Infractions: ${infractionSummary.count}\nPoints: ${infractionSummary.points}`;
        embed.fields.find(f => f.name.startsWith("Resolved")).value = `${mod?.displayName} retracted the warning.`;

        message.edit({embed});

        react.remove();

        let member = message.guild.members.cache.get(retraction.discordId);
        if (member) {
          let quote = u.embed(embed);
          quote.fields = quote.fields.filter(f => !f.name.startsWith("Jump") && !f.name.startsWith("Infraction Summary"));
          member.send(`**${mod?.displayName}** has retracted a warning.`, {embed: quote}).catch(u.noop);
        }
      }
    } else if (infraction.mod != Module.client.user.id) {
      /***************************************
      **  Only process non-processed cards  **
      ***************************************/
      return;
    } else if (reaction == cardReactions[0]) {
      /*********************
      **  Post Full Info  **
      *********************/
      let member = message.guild.members.cache.get(infraction.discordId);

      let roleString = member.roles.cache.sort((a, b) => b.comparePositionTo(a)).map(role => role.name).join(", ");
      if (roleString.length > 1024) roleString = roleString.substr(0, roleString.indexOf(", ", 1000)) + " ...";

      let userDoc = await Module.db.user.fetchUser(member.id);

      let infractionSummary = await Module.db.infraction.getSummary(member.id);

      let infractionDescription = [`**${u.escapeText(member.displayName)}** has had **${infractionSummary.count}** infraction(s) in the last **${infractionSummary.time}** days, totalling **${infractionSummary.points}** points.`];
      if ((infractionSummary.count > 0) && (infractionSummary.detail.length > 0)) {
        for (let record of infractionSummary.detail) {
          let recordMod = message.guild.members.cache.get(record.mod);
          infractionDescription.push(`${record.timestamp.toLocaleDateString()} (${record.value}) pts, modded by ${recordMod?.displayName}): ${record.description}`);
        }
      }

      infractionDescription = infractionDescription.join("\n");
      if (infractionDescription.length > 2048) infractionDescription = infractionDescription.substr(0, infractionDescription.indexOf("\n", 1950)) + "\n...";

      let infoEmbed = u.embed()
      .setTimestamp()
      .setAuthor(member.displayName, member.user.displayAvatarURL())
      .setThumbnail(member.user.displayAvatarURL({dynamic: true}))
      .setDescription(infractionDescription)
      .addField("ID", member.id, true)
      .addField("Activity", `Posts: ${parseInt(userDoc.posts, 10).toLocaleString()}`, true)
      .addField("Roles", roleString)
      .addField("Joined", member.joinedAt.toUTCString(), true)
      .addField("Account Created", member.user.createdAt.toUTCString(), true);
      message.channel.send({embed: infoEmbed, disableEveryone: true});
    } else if (reaction == cardReactions[1]) {
      /********************
      **  Ignore a flag  **
      ********************/
      await Module.db.infraction.retract(message.id, infraction.mod);

      embed.setColor(0x00FF00);
      embed.addField("Resolved", mod.displayName + " cleared the flag.");
      embed.fields = embed.fields.filter(f => !f.name.startsWith("Jump"));
      await message.reactions.removeAll();
      message.edit({embed});
    } else if (cardReactions.includes(reaction)) {
      /**************************
      **  Warn as appropriate  **
      **************************/
      embed.setColor(0x0000FF);
      infraction.mod = mod.id;
      let member = message.guild.members.cache.get(infraction.discordId);

      if (reaction == cardReactions[2]) {         // Verbal warning
        infraction.value = 0;
        embed.setColor(0x00FFFF).addField("Resolved", mod.displayName + " issued a verbal warning.");
      } else if (reaction == cardReactions[3]) {  // Minor infraction
        infraction.value = 1;
        embed.addField("Resolved", mod.displayName + " issued a 1 point warning.");
      } else if (reaction == cardReactions[4]) {  // Moderate infraction
        infraction.value = 5;
        embed.addField("Resolved", mod.displayName + " issued a 5 point warning.");
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
        embed.addField("Resolved", mod.displayName + " muted the member.");
      } else {  // It wasn't really a thing
        return;
      }

      let inf = await Module.db.infraction.update(infraction._id, infraction);

      let infractionSummary = await Module.db.infraction.getSummary(infraction.discordId);

      if (member) {
        let quote = u.embed()
        .setAuthor(member.displayName, member.user.displayAvatarURL())
        .addField("Channel", `#${message.guild.channels.cache.get(infraction.channel).name}`)
        .setDescription(message.embeds[0].description)
        .setTimestamp(message.createdAt);

        let response = (
          (infraction.value == 0) ?
          `The LDSG Mods would like to speak with you about the following post. It may be that they're looking for some additional context or just want to handle things informally.\n\n**${mod.displayName}** will be reaching out to you shortly, if they haven't already.` :
          `We have received one or more complaints regarding content you posted. We have reviewed the content in question and have determined, in our sole discretion, that it is against our code of conduct (<https://ldsgamers.com/code-of-conduct>). This content was removed on your behalf. As a reminder, if we believe that you are frequently in breach of our code of conduct or are otherwise acting inconsistently with the letter or spirit of the code, we may limit, suspend or terminate your access to the LDSG Discord server.\n\n**${mod.displayName}** has issued this warning.`
        );

        member.send(response, {embed: quote})
        .catch(() => blocked(member));
      }

      embed.fields = embed.fields.filter(f => !f.name || !f.name.startsWith("Jump"));
      embed.fields.find(f => f.name && f.name.startsWith("Infraction")).value = `Infractions: ${infractionSummary.count}\nPoints: ${infractionSummary.points}`;

      await message.reactions.removeAll();
      await message.edit({embed});

      if (infraction.value > 0) {
        try {
          let msg = await message.guild.channels.cache.get(infraction.channel).messages.fetch(infraction.message);
          if (msg) u.clean(msg, 0);

          message.react("⏪").then(r => {
            setTimeout((r) => r.remove().catch(u.noop), 600000, r);
          }).catch(u.noop);
        } catch(e) { u.noop(); }
      }
    }
  } catch(e) { u.errorHandler(e, "Mod Card Reaction"); }
}

/********************
**  Filter Events  **
********************/
const Module = new Augur.Module()
.addCommand({name: "grownups",
  description: "The grownups are talking here.",
  info: "Temporarily (default 15 minutes, max 30 minutes) disable the chat filter in a mod/Team channel to allow for conversation about modding.",
  syntax: "minutes",
  category: "Mod",
  permissions: msg => (msg.channel.parentID == "363020585988653057" || msg.channel.parentID == "800827468315492352") && msg.member.roles.cache.has(Module.config.roles.mod),
  process: (msg, suffix) => {
    let time = Math.min(30, parseInt(suffix, 10) || 15);
    msg.channel.send(`*Whistles and wanders off for ${time} minutes...*`);
    if (grownups.has(msg.channel.id)) clearTimeout(grownups.get(msg.channel.id));

    grownups.set(msg.channel.id, setTimeout((channel) => {
      grownups.delete(channel.id);
      channel.send("*I'm watching you again...* <:geyes:766719587533455420>");
    }, time * 60 * 1000, msg.channel));
  }
})
.addEvent("message", processMessageLanguage)
.addEvent("messageUpdate", processMessageLanguage)
.addEvent("messageReactionAdd", async (reaction, user) => {
  const message = reaction.message;
  try {
    if ((message.channel.id == modLogs) && !user.bot && (message.author.id == message.client.user.id)) {
      if (cardReactions.includes(reaction.emoji.name) || reaction.emoji.name == "⏪") {
        let flag = await Module.db.infraction.getByFlag(message.id);
        let mod = message.guild.members.cache.get(user.id);
        if (flag) processCardReaction(reaction, mod, flag);
      }
    }
  } catch(e) { u.errorHandler(e, "Card Reaction Processing"); }
});

module.exports = Module;
