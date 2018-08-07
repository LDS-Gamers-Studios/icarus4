const Augur = require("augurbot"),
  u = require("../utils/utils");

const roles = {
	"overwatch pc": "184397175978065921",
	"overwatch ps": "184397093954125825",
	"overwatch xb": "184396518143426570",
	"ark pc": "258329492030750721",
	"ark xb": "258329149859561484",
	"firearms": "348136185106923521",
	"rhythm": "360444518190940163",
	"twitch raider": "309889486521892865",
	"rated m": "281708645161631745",
	"rated t": "281708630104080394",
	"rated e": "281708450822750208",
	"halocodes": "434470406167199745"
};

const aliases = {
	"overwatch-pc": "overwatch pc",
	"overwatchpc": "overwatch pc",
	"overwatch-ps4": "overwatch ps",
	"overwatchps4": "overwatch ps",
	"overwatch ps4": "overwatch ps",
	"overwatch-ps": "overwatch ps",
	"overwatchps": "overwatch ps",
	"overwatch xb1": "overwatch xb",
	"overwatch-xb1": "overwatch xb",
	"overwatchxb1": "overwatch xb",
	"overwatch-xb": "overwatch xb",
	"overwatchxb": "overwatch xb",
	"ark-pc": "ark pc",
	"arkpc": "ark pc",
	"ark-xb1": "ark xb",
	"ark xb1": "ark xb",
	"arkxb1": "ark xb",
	"ark-xb": "ark xb",
	"arkxb": "ark xb",
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
},
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
},
.addCommand({name: "role",
  description: "See who has a role.",
  syntax: "[role name]",
  process: (msg, suffix) => {
    let guild = msg.guild;
    let role = guild.roles.find(r => r.name.toLowerCase() == suffix.toLowerCase());
    if (role) msg.channel.send(`Members with the ${role.name} role:\n\`\`\`${role.members.map(m => m.displayName).join("\n")}\`\`\``, {split: {prepend: "```", append: "```"}});
    else msg.channel.send("I couldn't find that role. :shrug:");
  },
  permissions: (msg) => msg.guild
}

module.exports = Module;
