const Augur = require("augurbot"),
  u = require("../utils/utils");

const tags = new Map();

function runTag(msg) {
  let cmd = u.parse(msg);
  if (cmd && tags.get(msg.guild.id).has(cmd.tag)) {
    let tag = tags.get(msg.guild.id).get(cmd.tag);
    if (tag.attachment) {
      msg.channel.send(
        tag.response,
        {
          file: {
            attachment: process.cwd() + "/storage/" + tag._id,
            name: tag.attachment
          }
        }
      );
    } else msg.channel.send(tag.response);
    return true;
  } else if (cmd && (cmd.tag == "help") && (tags.get(msg.guild.id).size > 0) && !cmd.suffix) {
    let embed = u.embed()
    .setTitle("Custom tags in " + msg.guild.name)
    .setThumbnail(msg.guild.iconURL);

    let prefix = u.prefix(msg);
    prefix = prefix.replace(/<@!?d+>/g, `@${msg.guild.members.get(msg.client.user.id).displayName} `);

    let list = Array.from(tags.get(msg.guild.id).values()).map(c => prefix + c.tag).sort();

    embed.setDescription(list.join("\n"));
    msg.author.send(embed);
  }
}

const Module = new Augur.Module()
.addCommand({name: "tag",
  aliases: ["addtag"],
  category: "Server Admin",
  syntax: "<Command Name> <Command Response>",
  description: "Adds a custom command for your server.",
  info: "Adds a custom command for your server. If the command has the same name as one of the default commands, the custom command will override the default functionality.",
  process: async (msg, suffix) => {
    if (suffix) {
      let args = suffix.split(" ");
      let newTag = args.shift().toLowerCase();
      let response = args.join(" ");
      let attachment = ((msg.attachments && (msg.attachments.size > 0)) ? msg.attachments.first() : null);

      if (response || attachment) {
        try {
          let cmd = await Module.db.tags.addTag({
            serverId: msg.guild.id,
            tag: newTag,
            response: response,
            attachment: (attachment ? attachment.filename : null),
            url: (attachment ? attachment.url : null)
          });

          if (!tags.has(cmd.serverId)) tags.set(cmd.serverId, new Map());
          tags.get(cmd.serverId).set(cmd.tag, cmd);
          msg.channel.send(`I added the \`${u.prefix(msg)}${cmd.tag}\` command to your server!`).then(u.clean);
        } catch(e) { u.alertError(e, msg); }
      } else if (tags.has(msg.guild.id) && tags.get(msg.guild.id).has(newTag)) {
        try {
          let cmd = await Module.db.tags.removeTag(msg.guild, newTag);
          tags.get(cmd.serverId).delete(cmd.tag);
          msg.channel.send(`I removed the custom \`${u.prefix(msg)}${cmd.tag}\` command.`);
        } catch(e) { u.alertError(e, msg); }
      } else
        msg.reply(`I couldn't find the command \`${u.prefix(msg)}${newTag}\` to alter.`);
    } else {
      msg.reply("you need to tell me the command name and the intended command response.").then(u.clean);
    }
  },
  permissions: (msg) => msg.guild && (msg.member.permissions.has("MANAGE_GUILD") || msg.member.permissions.has("ADMINISTRATOR") || Module.config.adminId.includes(msg.author.id))
})
.setInit(() => {
  Module.db.tags.fetchTags().then(cmds => {
    cmds = cmds.filter(c => Module.handler.client.guilds.has(c.serverId));
    console.log(`Loaded ${cmds.length} custom commands${(Module.handler.client.shard ? " on Shard " + Module.handler.client.shard.id : "")}.`);
    cmds.forEach(cmd => {
      if (!tags.has(cmd.serverId)) tags.set(cmd.serverId, new Map());
      tags.get(cmd.serverId).set(cmd.tag, cmd);
    });
  });
})
.addEvent("message", (msg) => {
  if (msg.guild && tags.has(msg.guild.id)) return runTag(msg);
})
.addEvent("messageUpdate", (oldMsg, msg) => {
  if (msg.guild && tags.has(msg.guild.id)) return runTag(msg);
});

module.exports = Module;
