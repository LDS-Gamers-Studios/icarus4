const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addEvent("channelCreate", (channel) => {
  if (channel.guild?.id == Module.config.ldsg) {
    if (channel.permissionsFor(channel.client.user.id).has(["VIEW_CHANNEL", "MANAGE_CHANNELS"])) {
      channel.createOverwrite(Module.config.roles.muted, {
        VIEW_CHANNEL: false,
        CONNECT: false,
        SEND_MESSAGES: false,
        SPEAK: false
      }).catch(e => u.errorHandler(e, `Update New Channel Permissions: ${channel.name}`));
      channel.createOverwrite("771516264618262607", {
        VIEW_CHANNEL: false,
        CONNECT: false,
        SEND_MESSAGES: false,
        SPEAK: false
      }).catch(e => u.errorHandler(e, `Update New Channel Permissions: ${channel.name}`));
    } else {
      u.errorLog.send(u.embed().setTitle("Update New Channel Permissions").setDescription(`Insufficient permissions to update channel ${channel.name}. Muted permissions need to be applied manually.`));
    }
  }
})
.addEvent("guildBanAdd", (guild, user) => {
  if (guild.id == Module.config.ldsg) {
    if (guild.client.ignoreNotifications?.has(user.id)) {
      guild.client.ignoreNotifications.delete(user.id);
    } else {
      guild.client.channels.cache.get(modLogs).send(`**${user.username}** has been banned.`);
    }
  }
})
.addEvent("guildMemberRemove", async (member) => {
  try {
    if (member.guild.id == Module.config.ldsg) {
      // await Module.db.user.updateRoles(member);
      if (!member.client.ignoreNotifications?.has(member.id)) {
        let user = await Module.db.user.fetchUser(member.id);
        let embed = u.embed()
        .setAuthor(member.displayName, member.user.displayAvatarURL({dynamic: true}))
        .setTitle(`**${member.displayName}** has left the server.`)
        .setColor(0x4e5d94)
        .addField("Joined", (member.joinedAt?.toLocaleDateString() || "Some time in the past"), true)
        .addField("Posts", user?.posts || 0, true);

        member.guild.channels.cache.get(Module.config.channels.modlogs).send({embed});
      }
    }
  } catch(error) { u.errorHandler(error, `Member Leave: ${member.displayName}`); }
})
.addEvent("messageReactionAdd", async (reaction, user) => {
  message = reaction.message;
  if (message.guild?.id != Module.config.ldsg || user.bot) return;
  if ((reaction.emoji.name == "📌") && message.pinnable) {
    // Pin Request
    try {
      if (message.channel.permissionsFor(user).has("MANAGE_MESSAGES")) {
        let messages = await message.channel.messages.fetchPinned().catch(u.noop);
        if (messages?.size == 50) return message.channel.send(`${user}, I was unable to pin the message since the channel pin limit has been reached.`).then(u.clean);
        else message.pin();
      } else if (reaction.count == 1) {
        let embed = u.embed()
        .setTimestamp()
        .setAuthor(message.member.displayName + " 📌", message.member.user.displayAvatarURL())
        .setDescription(message.cleanContent)
        .addField("Pin Requested By", message.guild.members.cache.get(user.id).displayName)
        .addField("Channel", message.channel.toString())
        .addField("Jump to Post", `[Original Message](${message.url})`);

        if (message.attachments?.size > 0)
          embed.setImage(message.attachments?.first()?.url);

        message.guild.channels.cache.get("506575671242260490").send({embed});
      }
    } catch(e) { u.errorHandler(e, "Pin Request Processing"); }
  } else if ((message.channel.id == Module.config.channels.modlogs) && (reaction.emoji.name == "🔗") && (reaction.count == 1) && ((Date.now() - message.createdTimestamp) < (24 * 60 * 60 * 1000))) {
    // Move posts from #mod-logs to #mod-discussion
    try {
      let ldsg = message.guild;
      let embed = (message.embeds.length > 0 ? u.embed(message.embeds[0]) : null);
      embed?.setFooter(`Linked by ${ldsg.members.cache.get(user.id)?.displayName || user.username}`);
      ldsg.channels.cache.get("506575277820739611").send(message.content, {embed});
    } catch(e) { u.errorHandler(e, "Mod Log Link Processing"); }
  }
})
.addEvent("userUpdate", async (oldUser, newUser) => {
  try {
    let ldsg = newUser.client.guilds.cache.get(Module.config.ldsg);
    let newMember = ldsg.members.cache.get(newUser.id);
    if (newMember && (!newMember.roles.cache.has(Module.config.roles.trusted) || newMember.roles.cache.has(Module.config.roles.untrusted))) {
      let user = await Module.db.user.fetchUser(newMember).catch(u.noop);
      const embed = u.embed()
        .setTimestamp()
        .setAuthor(oldUser.username, oldUser.displayAvatarURL())
        .setFooter(`${user.posts} Posts in ${Math.round((Date.now() - (newMember?.joinedTimestamp || 0)) / (30 * 24 * 60 * 60 * 1000))} Months`)
        .setTitle("User Update");
      if (oldUser.tag != newUser.tag) {
        embed.addField("**Username Update**", `**Old:** ${oldUser.tag}\n**New:** ${newUser.tag}`);
      }
      if (oldUser.avatar != newUser.avatar) {
        embed.addField("**Avatar Update**", "See Below").setImage(newUser.displayAvatarURL({dynamic: true}));
      } else {
        embed.setThumbnail(newUser.displayAvatarURL());
      }
      ldsg.channels.cache.get("725797487129919488").send(`${newUser}: ${newUser.id}`, {embed});
    }
  } catch(error) { u.errorHandler(error, `User Update Error: \`${newUser?.username}\``); }
});

module.exports = Module;
