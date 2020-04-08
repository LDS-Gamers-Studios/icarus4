const Augur = require("augurbot"),
  u = require("../utils/utils");

const roles = new Map();

/*
const inventory = new Collection([
  ["114499378936283143", "#3cfc00"], // Founder
  ["96360253850935296", "#9ed69e"], // LDSG Management
  ["205826273639923722", "#8aa4de"], // Discord Manager
  ["96345401078087680", "#ff8a00"], // LDSG Team
  ["692463991670177792", "#11806a"],  // LDSG Steam Group Founder
  ["503066022912196608", "#e93131"], // Discord Moderators
  ["416256900963893248", "#fff8bc"], // LDSG Youth Rep
  ["318427374309998592", "#b1ff00"], // Tournament Champion
  ["121783903630524419", "#4165ff"], // Pro Sponsors
  ["121783798647095297", "#00ffd0"], // Onyx Sponsors
  ["114816596341424129", "#f36c40"], // Elite Sponsors
  ["497887238001262592", "#e9ef27"], // Affiliates
  ["338056125062578176", "#8f39de"], // Twitch Subscriber
  ["114817401614368775", "#ecc700"], // Donators
  ["114492841367044098", "#ffcb6e"], // Games Keeper
  ["309889486521892865", "#9065b8"], // Twitch Raiders
  ["514873057664434177", "#fc7b69"], // Swag Commander
  ["514872896313622539", "#fc7b69"], // Swag Captain
  ["441267815622639616", "#fc7b69"], // Swagoteer
  ["448935116262080514", "#f1c40f"], // GG
  ["585537191648952323", "#f47fff"], // Nitro Booster
  ["590255542686056451", "#5a2700"], // BBQ Bros
  ["646047904192135201", "#ffec00"] // 3,000th Member
]);

const colors = new Collection([
  ["#ff8a00", "697257736789819393"],
  ["#9ed69e", "697257737133883435"],
  ["#ffcb6e", "697257737788194896"],
  ["#3cfc00", "697257738010493049"],
  ["#f36c40", "697257738626924616"],
  ["#ecc700", "697257738710941697"],
  ["#00ffd0", "697257739507990528"],
  ["#4165ff", "697257739973558283"],
  ["#ffffff", "697257740099256431"],
  ["#8aa4de", "697257740443058208"],
  ["#e6e6e6", "697257740984254465"],
  ["#7289da", "697257741466730566"],
  ["#884edd", "697257741986693210"],
  ["#9065b8", "697257742364049418"],
  ["#b1ff00", "697257742502723745"],
  ["#8f39de", "697257743295316008"],
  ["#fff8bc", "697257744402612224"],
  ["#fc7b69", "697257745304387594"],
  ["#f1c40f", "697257745971281931"],
  ["#e9ef27", "697257746759942144"],
  ["#e93131", "697257747250675772"],
  ["#f47fff", "697257747674038352"],
  ["#5a2700", "697257748236337322"],
  ["#ffec00", "697257748789985300"],
  ["#ff0000", "697257749641297940"],
  ["#11806a", "697257750677159946"]
]);
*/

const inventory = new Map([
	["114499378936283143", "697257738010493049"],
	["96360253850935296" , "697257737133883435"],
	["205826273639923722", "697257740443058208"],
	["96345401078087680" , "697257736789819393"],
	["692463991670177792", "697257750677159946"],
	["503066022912196608", "697257747250675772"],
	["416256900963893248", "697257744402612224"],
	["318427374309998592", "697257742502723745"],
	["121783903630524419", "697257739973558283"],
	["121783798647095297", "697257739507990528"],
	["114816596341424129", "697257738626924616"],
	["497887238001262592", "697257746759942144"],
	["338056125062578176", "697257743295316008"],
	["114817401614368775", "697257738710941697"],
	["114492841367044098", "697257737788194896"],
	["309889486521892865", "697257742364049418"],
	["514873057664434177", "697257745304387594"],
	["514872896313622539", "697257745304387594"],
	["441267815622639616", "697257745304387594"],
	["448935116262080514", "697257745971281931"],
	["585537191648952323", "697257747674038352"],
	["590255542686056451", "697257748236337322"],
	["646047904192135201", "697257748789985300"]
]);

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
      msg.reply("you didn't give me a valid role to apply.")
        .then(u.clean);
    }
  }
})
.addCommand({name: "equip",
  description: "Equip a color from your inventory.",
  category: "Members",
  process: async (msg, suffix) => {
    let ldsg = msg.client.guilds.get(Module.config.ldsg);
    let member = ldsg.members.get(msg.author.id);
    let role = ldsg.roles.find(r => r.name.toLowerCase() == suffix.toLowerCase());
    if (!role) {
      u.clean(msg);
      msg.reply("sorry, that's not a role on the server. Check `!inventory` to see what you can equip.").then(u.clean);
    } else if (!member.roles.has(role.id)) {
      u.clean(msg);
      msg.reply("sorry, you don't have that role. Check `!inventory` to see what you can equip.").then(u.clean);
    } else if (!inventory.has(role.id)) {
      u.clean(msg);
      msg.reply("sorry, that role isn't equippable. Check `!inventory` to see what you can equip.").then(u.clean);
    } else {
      // The role exists, the member has it, and it's equippable
      try {
        let toAdd = ldsg.roles.get(inventory.get(role.id));
        await member.removeRoles(Array.from(inventory.values()));
        await member.addRole(toAdd);
        msg.react("👌");
      } catch(e) { u.alertError(e, msg); }
    }
  }
})
.addCommand({name: "unequip",
  description: "Unequip all colors from your inventory.",
  category: "Members",
  process: async (msg) => {
    try {
      let ldsg = msg.client.guilds.get(Module.config.ldsg);
      let member = ldsg.members.get(msg.author.id);
      await member.removeRoles(Array.from(inventory.values()));
      msg.react("👌");
    } catch(error) { u.alertError(error, msg); }
  }
})
.addCommand({name: "inventory",
  description: "Check your color inventory.",
  category: "Members",
  process: (msg) => {
    let member = msg.client.guilds.get(Module.config.ldsg).members.get(msg.author.id);
    let roles = member.roles.filter(r => inventory.has(r.id));
    if (roles.size == 0) {
      u.botSpam(msg).send(msg.author + ", you don't have any colors in your inventory!");
    } else {
      u.botSpam(msg).send(`${msg.author}, you have the following role colors that you can equip through \`!equip name\`:\n${roles.map(r => r.name).join("\n")}`);
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
      msg.reply("you didn't give me a valid role to remove.")
        .then(u.clean);
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
    } else {
      msg.reply("you need to tell me a role to find!")
        .then(u.clean);
    }
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
.addEvent("guildMemberUpdate", (oldMember, newMember) => {
  if (newMember.guild.id == Module.config.ldsg) {
    if (newMember.roles.size > oldMember.roles.size) {
      // Role added
      for (const [id, role] of newMember.roles) {
        if (!oldMember.roles.has(id) && inventory.has(id)) {
          // New equippable!
          newMember.send(`You now have the color-equippable role **${role.name}**! You can equip the color with the \`!equip ${role.name}\` command.`);
        }
      }
      Module.db.user.updateRoles(newMember);
    } else if (newMember.roles.size < oldMember.roles.size) {
      // Role removed
      for (const [id, role] of oldMember.roles) {
        if (!newMember.roles.has(id) && inventory.has(id)) {
          // Lost equippable!
          newMember.removeRole(inventory.get(id));
        }
      }
      Module.db.user.updateRoles(newMember);
    }
  }
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
