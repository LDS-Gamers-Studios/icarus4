const Augur = require("augurbot"),
  u = require("../utils/utils"),
  {roles, aliases} = require("../data/roles.json");

const Module = new Augur.Module()
.addCommand({name: "addrole",
  description: "Add a role",
  syntax: Object.keys(roles).join(" | "),
  aliases: ["addchannel", "add"],
  info: "Gives you one of the following roles:\n```md\n* " + Object.keys(roles).join("\n* ") + "```",
  category: "Members",
  process: (msg, suffix) => {
    if (aliases[suffix.toLowerCase()]) suffix = aliases[suffix.toLowerCase()];
    if (roles[suffix.toLowerCase()]) {
      let ldsg = msg.client.guilds.get(Module.config.ldsg);
      let modLogs = msg.client.channels.get("506575671242260490");
      let role = ldsg.roles.get(roles[suffix.toLowerCase()]);

      ldsg.fetchMember(msg.author.id).then(member => {
        if (member) member.addRole(role).then((member) => {
          msg.react("👌");
          modLogs.send(`ℹ️ **${member.displayName}** added the ${role.name} role.`);
        });
      });
    } else {
      msg.reply("you didn't give me a valid role to apply.").then(u.clean);
    }
  }
})
.addCommand({name: "nopings",
  description: "Remove a pingable role for your current channel",
  permissions: (msg) => msg.guild && msg.guild.id == "96335850576556032",
  category: "Members",
  hidden: true,
  process: async (msg) => {
    try {
      u.clean(msg);
      let channel = msg.channel.name.toLowerCase().replace(/(general)|(lfg)/ig, "").replace(/\-+/g, " ").trim();
      channel = (channel ? u.properCase(channel) : "LDSGamer");
      let role = msg.member.roles.find(r => r.name.toLowerCase() == channel.toLowerCase());
      if (!role) {
        msg.reply("I couldn't see a pingable role for this channel applied to you.");
      } else {
        await msg.member.removeRole(role);
        msg.react("👌");
      }
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
  }
})
.addCommand({name: "pingme",
  description: "Add a pingable role for your current channel",
  permissions: (msg) => msg.guild && msg.guild.id == "96335850576556032",
  category: "Members",
  process: async (msg) => {
    try {
      let channel = msg.channel.name.toLowerCase().replace(/(general)|(lfg)/ig, "").replace(/\-+/g, " ").trim();
      channel = (channel ? u.properCase(channel) : "LDSGamer");
      let role = msg.guild.roles.find(r => r.name.toLowerCase() == channel.toLowerCase());
      if (!role) {
        role = await msg.guild.createRole({
          name: channel,
          permissions: [],
          mentionable: true
        });
      }
      await msg.member.addRole(role);
      await msg.react("👌");
      u.clean(msg);
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
  }
})
.addCommand({name: "removerole",
  description: "Remove a channel",
  syntax: Object.keys(roles).join(" | "),
  aliases: ["removechannel", "remove"],
  info: "Removes one of the following roles:\n```md\n* " + Object.keys(roles).join("\n* ") + "```",
  category: "Members",
  process: (msg, suffix) => {
    if (aliases[suffix.toLowerCase()]) suffix = aliases[suffix.toLowerCase()];
    if (roles[suffix.toLowerCase()]) {
      let ldsg = msg.client.guilds.get(Module.config.ldsg);
      let modLogs = msg.client.channels.get("506575671242260490");
      let role = ldsg.roles.get(roles[suffix.toLowerCase()]);

      ldsg.fetchMember(msg.author).then(member => {
        if (member) member.removeRole(role).then((member) => {
          msg.react("👌");
          modLogs.send(`ℹ️ **${member.displayName}** removed the ${role.name} role.`);
        });
      });
    } else {
      msg.reply("you didn't give me a valid role to remove.").then(u.clean);
    }
  }
})
.addCommand({name: "role",
  description: "See who has a role.",
  syntax: "<role name>",
  aliases: ["hasrole"],
  category: "Members",
  process: (msg, suffix) => {
    if (suffix) {
      let guild = msg.guild;
      let role = guild.roles.find(r => r.name.toLowerCase() == suffix.toLowerCase());
      if (role && role.members.size > 0) msg.channel.send(`Members with the ${role.name} role:\n\`\`\`${role.members.map(m => m.displayName).sort().join("\n")}\`\`\``, {split: {prepend: "```", append: "```"}});
      else msg.channel.send("I couldn't find any members with that role. :shrug:");
    } else msg.reply("you need to tell me a role to find!").then(u.clean);
  },
  permissions: (msg) => msg.guild
})
.setUnload(() => {
  const path = require("path");
  delete require.cache[require.resolve(path.resolve(process.cwd(), "./data/roles.json"))];
});

module.exports = Module;
