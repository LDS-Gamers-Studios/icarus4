const Augur = require("augurbot"),
  {Collection} = require("discord.js"),
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

const inventory = new Collection([
  ["114499378936283143", "697257738010493049"], // Founder
  ["96360253850935296",  "697257737133883435"], // LDSG Management
  ["205826273639923722", "697257740443058208"], // Discord Manager
  ["96345401078087680",  "697257736789819393"], // LDSG Team
  ["503066022912196608", "697257747250675772"], // Discord Moderators
  ["114492841367044098", "697257737788194896"], // Games Keeper
  ["114490059452841985", "755865818029490347"], // Minecraft Mods

  ["121783903630524419", "697257739973558283"], // Pro Sponsors
  ["121783798647095297", "697257739507990528"], // Onyx Sponsors
  ["114816596341424129", "697257738626924616"], // Elite Sponsors
  ["114817401614368775", "697257738710941697"], // Donators
  ["497887238001262592", "697257746759942144"], // Affiliates

  ["282364647041007616", "755868168446279891"], // H Bb
  ["282364721045438464", "755868476618440795"], // H Fb
  ["282364218282606594", "755868684202803300"], // H Sc

  ["338056125062578176", "697257743295316008"], // Twitch Subscriber
  ["309889486521892865", "697257742364049418"], // Twitch Raiders

  ["514873057664434177", "755869754425737299"], // Swag Commander
  ["514872896313622539", "755870052544282704"], // Swag Captain
  ["441267815622639616", "697257745304387594"], // Swagoteer

  ["731895666577506345", "755869049774407722"], // Tenure Color 5
  ["543065980096741386", "755869445716705310"], // Tenure Color 4
  ["375047792487432192", "755870945650147391"], // Tenure Color 3
  ["375047691253579787", "755871416561434727"], // Tenure Color 2
  ["375047444599275543", "755871686779338873"], // Tenure Color 1

  ["202936368362422275", "755871675718828063"], // Ancient
  ["202935996164079617", "755872080968417281"], // Legend
  ["202936107472650240", "755872357180113136"], // Hero
  ["202935950119010304", "755872561845239909"], // Veteran
  ["203208457363390464", "755872851323650111"], // Novice

  ["585537191648952323", "697257747674038352"], // Nitro Booster
  ["508030176072957952", "698293543470497944"], // Extra Life Donor
  ["507031155627786250", "737408727522476093"], // Extra Life Team
  ["692463991670177792", "697257750677159946"], // LDSG Steam Group Founder
  ["448935116262080514", "697257745971281931"], // GG
  ["318427374309998592", "697257742502723745"] // Tournament Champion
]);

const Module = new Augur.Module()
.addCommand({name: "add",
  description: "Add an opt-in role",
  syntax: "[role tag]",
  aliases: ["addchannel", "addrole"],
  category: "Members",
  process: async (msg, suffix) => {
    try {
      if (roles.has(suffix.toLowerCase())) {
        let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);
        let modLogs = msg.client.channels.cache.get(Module.config.channels.modlogs);
        let role = ldsg.roles.cache.get(roles.get(suffix.toLowerCase()));

        let member = await ldsg.members.fetch(msg.author.id);
        if (member) await member.roles.add(role);
        msg.react("👌");
        modLogs.send(`ℹ️ **${member.displayName}** added the ${role.name} role.`);
      } else {
        msg.reply("you didn't give me a valid role to apply.")
        .then(u.clean);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "equip",
  description: "Equip a color from your inventory.",
  category: "Members",
  process: async (msg, suffix) => {
    try {
      let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);
      let member = await ldsg.members.fetch(msg.author.id);
      let role = ldsg.roles.cache.find(r => r.name.toLowerCase() == suffix.toLowerCase());
      if (!role) {
        u.clean(msg);
        msg.reply("sorry, that's not a role on the server. Check `!inventory` to see what you can equip.").then(u.clean);
      } else if (!member.roles.cache.has(role.id)) {
        u.clean(msg);
        msg.reply("sorry, you don't have that role. Check `!inventory` to see what you can equip.").then(u.clean);
      } else if (!inventory.has(role.id)) {
        u.clean(msg);
        msg.reply("sorry, that role isn't equippable. Check `!inventory` to see what you can equip.").then(u.clean);
      } else {
        // The role exists, the member has it, and it's equippable
        let toAdd = inventory.get(role.id);
        await member.roles.remove(Array.from(inventory.values()));
        await member.roles.add(toAdd);
        msg.react("👌");
      }
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "unequip",
  description: "Unequip all colors from your inventory.",
  category: "Members",
  process: async (msg) => {
    try {
      let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);
      let member = await ldsg.members.fetch(msg.author.id);
      await member.roles.remove(Array.from(inventory.values()));
      msg.react("👌");
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "inventory",
  description: "Check your color inventory.",
  category: "Members",
  process: async (msg) => {
    try {
      let member = await msg.client.guilds.cache.get(Module.config.ldsg).members.fetch(msg.author.id);
      let roles = member.roles.cache.filter(r => inventory.has(r.id));
      if (roles.size == 0) {
        u.botSpam(msg).send(`${msg.author}, you don't have any colors in your inventory!`);
      } else {
        u.botSpam(msg).send(`${msg.author}, you have the following role colors that you can equip through \`!equip name\`:\n${roles.map(r => r.name).join("\n")}`);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "remove",
  description: "Remove an opt-in role",
  syntax: Object.keys(roles).join(" | "),
  aliases: ["removechannel", "removerole"],
  category: "Members",
  process: async (msg, suffix) => {
    try {
      if (roles.has(suffix.toLowerCase())) {
        let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);
        let modLogs = msg.client.channels.cache.get(Module.config.channels.modlogs);
        let role = ldsg.roles.cache.get(roles.get(suffix.toLowerCase()));

        let member = await ldsg.members.fetch(msg.author);
        if (member) await member.roles.remove(role);
        msg.react("👌");
        modLogs.send(`ℹ️ **${member.displayName}** removed the ${role.name} role.`);
      } else {
        msg.reply("you didn't give me a valid role to remove.")
        .then(u.clean);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "role",
  description: "See who has a role.",
  syntax: "<role name>",
  aliases: ["hasrole"],
  category: "Members",
  process: (msg, suffix) => {
    if (suffix) {
      let role = msg.guild.roles.cache.find(r => r.name.toLowerCase() == suffix.toLowerCase());
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
      let role = msg.guild.roles.cache.find(r => r.name.toLowerCase() == suffix.toLowerCase());
      if (!role) msg.reply(`I couldn't find a role named ${suffix}.`);
      else msg.channel.send(`${role.name}: ${role.id}`, {code: true});
    }
  },
  permissions: (msg) => msg.guild
})
.addEvent("guildMemberUpdate", (oldMember, newMember) => {
  if (newMember.guild.id == Module.config.ldsg) {
    if (newMember.roles.cache.size > oldMember.roles.cache.size) {
      // Role added
      for (const [id, role] of newMember.roles.cache) {
        if (!oldMember.roles.cache.has(id) && inventory.has(id)) {
          // New equippable!
          if (newMember.roles.cache.some((r) => inventory.find(i => i == r.id))) {
            // They already have a role equipped
            newMember.send(`You now have the color-equippable role **${role.name}**! You can equip the color with the \`!equip ${role.name}\` command.`).catch(u.noop);
          } else {
            newMember.roles.add(inventory.get(id));
            newMember.send(`You now have the color-equippable role **${role.name}**! This has automatically been equipped for you. You can unequip it with the \`!unequip\` command.`).catch(u.noop);
          }
        }
      }
      Module.db.user.updateRoles(newMember);
    } else if (newMember.roles.cache.size < oldMember.roles.cache.size) {
      // Role removed
      for (const [id, role] of oldMember.roles.cache) {
        if (!newMember.roles.cache.has(id) && inventory.has(id)) {
          // Lost equippable!
          newMember.roles.remove(inventory.get(id));
        }
      }
      Module.db.user.updateRoles(newMember);
    }
  }
})
.addEvent("loadConfig", () => {
  Module.config.sheets.get("Opt-In Roles").getRows((e, rows) => {
    if (e) u.errorHandler(e, "Error loading opt-in roles.");
    else {
      for (let i = 0; i < rows.length; i++)
        roles.set(rows[i].roletag, rows[i].roleid);
      Module.client.commands.find(c => c.name == "add").info = "Gives you one of the following roles:\n```md\n* " + Array.from(roles.keys()).join("\n* ") + "```";
      Module.client.commands.find(c => c.name == "remove").info = "Remove one of the following roles:\n```md\n* " + Array.from(roles.keys()).join("\n* ") + "```";

      const fs = require("fs");
      const roleData = {};
      for (const [tag, roleId] of roles) {
        roleData[tag] = roleId;
      }
      fs.writeFileSync("./storage/roleInfo.json", JSON.stringify(roleData));
    }
  });
});

module.exports = Module;
