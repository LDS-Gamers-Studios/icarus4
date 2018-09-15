const Augur = require("augurbot"),
  u = require("../utils/utils");

const roles = {
	"firearms": "348136185106923521",
	"rhythm": "360444518190940163",
	"twitch raider": "309889486521892865",
	"rated m": "281708645161631745",
	"rated t": "281708630104080394",
	"rated e": "281708450822750208",
	"halocodes": "434470406167199745"
};

const aliases = {
	"firearm": "firearms",
	"gun": "firearms",
	"guns": "firearms",
	"m" : "rated m",
	"mature" : "rated m",
	"t" : "rated t",
	"teen" : "rated t",
	"e" : "rated e",
	"e10" : "rated e",
	"rated e10" : "rated e",
	"everyone": "rated e",

	"raider": "twitch raider",
	"twitch": "twitch raider",
	"twitchraider": "twitch raider",

	"halo": "halocodes"
};

const Module = new Augur.Module()
.addCommand({name: "addchannel",
  description: "Add a channel",
  syntax: Object.keys(roles).join(" | "),
  aliases: ["addrole", "add"],
  info: "Gives you one of the following roles/channels:\n```md\n* " + Object.keys(roles).join("\n* ") + "```",
  process: (msg, suffix) => {
    if (aliases[suffix.toLowerCase()]) suffix = aliases[suffix.toLowerCase()];
    if (roles[suffix.toLowerCase()]) {
      let ldsg = msg.client.guilds.get(Module.config.ldsg);
      let modLogs = msg.client.channels.get("154676105247195146");
      let role = ldsg.roles.get(roles[suffix.toLowerCase()]);

      ldsg.fetchMember(msg.author.id).then(member => {
        if (member) member.addRole(role).then((member) => {
          msg.reply(`Added the ${role.name} role! :thumbsup:`).then(u.clean);
          modLogs.send(`**${member.displayName}** added the ${role.name} role.`);
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
  process: async (msg) => {
    try {
      let channel = u.properCase(msg.channel.name.toLowerCase().replace(/(general)|(lfg)/ig, "").replace(/\-+/g, " ").trim());
      if (channel == "") channel = "LDSG";
      let role = msg.member.roles.find(r => r.name.toLowerCase() == channel.toLowerCase());
      if (!role) {
        msg.reply("I couldn't see a pingable role for this channel applied to you.");
      } else {
        await msg.member.removeRole(role);
        msg.reply(`I removed the \`@${channel}\` role!`);
      }
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
  }
})
.addCommand({name: "pingme",
  description: "Add a pingable role for your current channel",
  permissions: (msg) => msg.guild && msg.guild.id == "96335850576556032",
  process: async (msg) => {
    try {
      let channel = u.properCase(msg.channel.name.toLowerCase().replace(/(general)|(lfg)/ig, "").replace(/\-+/g, " ").trim());
      if (!channel) channel = "LDSG";
      let role = msg.guild.roles.find(r => r.name.toLowerCase() == channel.toLowerCase());
      if (!role) {
        role = await msg.guild.createRole({
          name: channel,
          permissions: 0,
          mentionable: true
        });
      }
      await msg.member.addRole(role);
      msg.reply(`I gave you the pingable \`@${channel}\` role!`);
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
  }
})
.addCommand({name: "removechannel",
  description: "Remove a channel",
  syntax: Object.keys(roles).join(" | "),
  aliases: ["removerole", "remove"],
  info: "Removes one of the following roles/channels:\n```md\n* " + Object.keys(roles).join("\n* ") + "```",
  process: (msg, suffix) => {
    if (aliases[suffix.toLowerCase()]) suffix = aliases[suffix.toLowerCase()];
    if (roles[suffix.toLowerCase()]) {
      let ldsg = msg.client.guilds.get(Module.config.ldsg);
      let modLogs = msg.client.channels.get("154676105247195146");
      let role = ldsg.roles.get(roles[suffix.toLowerCase()]);

      ldsg.fetchMember(msg.author).then(member => {
        if (member) member.removeRole(role).then((member) => {
          msg.reply(`Removed the ${role.name} role! :thumbsup:`).then(u.clean);
          modLogs.send(`**${member.displayName}** removed the ${role.name} role.`);
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
  process: (msg, suffix) => {
    if (suffix) {
      let guild = msg.guild;
      let role = guild.roles.find(r => r.name.toLowerCase() == suffix.toLowerCase());
      if (role) msg.channel.send(`Members with the ${role.name} role:\n\`\`\`${role.members.map(m => m.displayName).join("\n")}\`\`\``, {split: {prepend: "```", append: "```"}});
      else msg.channel.send("I couldn't find that role. :shrug:");
    } else msg.reply("you need to tell me a role to find!").then(u.clean);
  },
  permissions: (msg) => msg.guild
});

module.exports = Module;
