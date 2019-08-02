const Augur = require("augurbot"),
  u = require("../utils/utils");

const roles = new Map();

const Module = new Augur.Module()
.addCommand({name: "add",
  description: "Add an opt-in role",
  syntax: Object.keys(roles).join(" | "),
  aliases: ["addchannel", "addrole"],
  category: "Members",
  process: (msg, suffix) => {
    if (roles.has(suffix.toLowerCase())) {
      let ldsg = msg.client.guilds.get(Module.config.ldsg);
      let modLogs = msg.client.channels.get("506575671242260490");
      let role = ldsg.roles.get(roles.get(suffix.toLowerCase()));

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
.addCommand({name: "remove",
  description: "Remove an opt-in role",
  syntax: Object.keys(roles).join(" | "),
  aliases: ["removechannel", "removerole"],
  category: "Members",
  process: (msg, suffix) => {
    if (roles.has(suffix.toLowerCase())) {
      let ldsg = msg.client.guilds.get(Module.config.ldsg);
      let modLogs = msg.client.channels.get("506575671242260490");
      let role = ldsg.roles.get(roles.get(suffix.toLowerCase()));

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
.addCommand({name: "roleid",
  description: "Get a role ID",
  syntax: "<role name>",
  category: "Admin",
  hidden: true,
  process: (msg, suffix) => {
    if (!suffix) msg.reply("you need to tell me a role name!").then(u.clean);
    else {
      let role = msg.guild.roles.find(r => r.name.toLowerCase() == suffix.toLowerCase());
      if (!role) msg.reply(`I couldn't find a role named ${suffix}.`);
      else msg.channel.send(`${role.name}: ${role.id}`, {code: true});
    }
  },
  permissions: (msg) => msg.guild
})
.addEvent("loadConfig", () => {
  Module.config.sheets.get("Opt-In Roles").getRows((e, rows) => {
    if (e) u.alertError(e, "Error loading opt-in roles.");
    else {
      for (let i = 0; i < rows.length; i++)
        roles.set(rows[i].roletag, rows[i].roleid);
      Module.commands.find(c => c.name == "add").info = "Gives you one of the following roles:\n```md\n* " + Array.from(roles.keys()).join("\n* ") + "```";
      Module.commands.find(c => c.name == "remove").info = "Remove one of the following roles:\n```md\n* " + Array.from(roles.keys()).join("\n* ") + "```";
    }
  });
});

module.exports = Module;
