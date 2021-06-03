const Augur = require("augurbot"),
  {allColors, getInventory} = require("../utils/roleColors"),
  u = require("../utils/utils");

const roles = new Map();

const Module = new Augur.Module()
.addCommand({name: "add",
  description: "Add an opt-in role",
  syntax: "[role tag]",
  aliases: ["addchannel", "addrole"],
  category: "Members",
  process: async (msg, suffix) => {
    try {
      let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);
      if (Module.config.adminId.includes(msg.author.id)) {
        let member = ldsg.member(msg.author);
        let role = ldsg.roles.cache.find(r => r.name == suffix.toLowerCase());
        if (role) member.roles.add(role);
        else msg.reply(`I couldn't find the role \`${suffix}\`.`).then(u.clean);
      } else if (roles.has(suffix.toLowerCase())) {
        let role = ldsg.roles.cache.get(roles.get(suffix.toLowerCase()));

        let member = await ldsg.members.fetch(msg.author.id);
        if (member) await member.roles.add(role);
        msg.react("👌");
      } else {
        msg.reply("you didn't give me a valid role to apply.")
        .then(u.clean);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "adult",
  description: "Give someone the `Adulting` role.",
  category: "Members",
  syntax: "@user(s)",
  permissions: (msg) => msg.member?.roles.cache.has(Module.config.roles.mod),
  process: async (msg) => {
    if (msg.mentions.members.size > 0) {
      for (const [memberId, member] of msg.mentions.members) {
        try {
          await member.roles.add("809291931783921726");
        } catch(error) {
          msg.reply(`I couldn't apply the role to ${member}!`).then(u.clean);
        }
      }
      msg.react("👌");
    } else {
      msg.reply("you need to tell me who's the adult here!").then(u.clean);
    }
    u.clean(msg);
  }
})
.addCommand({name: "equip",
  description: "Equip a color from your inventory.",
  category: "Members",
  permissions: msg => msg.guild?.id == Module.config.ldsg,
  process: async (msg, suffix) => {
    try {
      let available = getInventory(msg.member);
      suffix = suffix.toLowerCase().replace(" colors", "");
      let role = msg.guild.roles.cache.find(r => r.name.toLowerCase() == suffix + " colors");

      if (!role) {
        u.clean(msg);
        msg.reply("sorry, that's not a color role on this server. Check `!inventory` to see what you can equip.").then(u.clean);
      } else if (!available.has(role.id)) {
        u.clean(msg);
        msg.reply("sorry, you don't have that color in your inventory. Check `!inventory` to see what you can equip.").then(u.clean);
      } else {
        // The role exists, the member has it in their inventory
        await msg.member.roles.remove(Array.from(allColors.values()));
        await msg.member.roles.add(role.id);
        msg.react("👌");
      }
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "unequip",
  description: "Unequip all colors from your inventory.",
  category: "Members",
  permissions: (msg) => msg.guild?.id == Module.config.ldsg,
  process: async (msg) => {
    try {
      await msg.member.roles.remove(Array.from(allColors.values()));
      msg.react("👌");
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "inventory",
  description: "Check your color inventory.",
  category: "Members",
  permissions: (msg) => msg.guild?.id == Module.config.ldsg,
  process: async (msg) => {
    try {
      let member = msg.member;
      let roles = getInventory(msg.member)
        .map(color => msg.guild.roles.cache.get(color))
        .sort((a, b) => b.comparePositionTo(a));
      let embed = u.embed().setAuthor(member.displayName, member.user.displayAvatarURL({size: 32}))
        .setTitle("Equippable Color Inventory")
        .setDescription(`Equip a color role with \`${Module.config.prefix}equip Role Name\`\ne.g. \`${Module.config.prefix}equip novice\`\n\n${roles.join("\n")}`);

      if (roles.length == 0) {
        u.botSpam(msg).send(`${msg.author}, you don't have any colors in your inventory!`);
      } else {
        u.botSpam(msg).send({embed, disableMentions: "all"});
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
      let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);
      if (Module.config.adminId.includes(msg.author.id)) {
        let member = ldsg.member(msg.author);
        let role = ldsg.roles.cache.find(r => r.name == suffix.toLowerCase());
        if (role) member.roles.remove(role);
        else msg.reply(`I couldn't find the role \`${suffix}\`.`).then(u.clean);
      } else if (roles.has(suffix.toLowerCase())) {
        let modLogs = msg.client.channels.cache.get(Module.config.channels.modlogs);
        let role = ldsg.roles.cache.get(roles.get(suffix.toLowerCase()));

        let member = await ldsg.members.fetch(msg.author);
        if (member) await member.roles.remove(role);
        msg.react("👌");
        //modLogs.send(`ℹ️ **${member.displayName}** removed the ${role.name} role.`);
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
      if (role && role.members.size > 0) msg.channel.send(`Members with the ${role.name} role:\n\`\`\`\n${role.members.map(m => m.displayName).sort().join("\n")}\n\`\`\``, {split: {prepend: "```\n", append: "\n```"}});
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
.addEvent("guildMemberUpdate", async (oldMember, newMember) => {
  if (newMember.guild.id == Module.config.ldsg) {
    if (newMember.roles.cache.size > oldMember.roles.cache.size) {
      // Role added
      try {
        if ((Date.now() - newMember.joinedTimestamp) > 45000) {
          // Check equippables if they're not auto-applying on rejoin
          let newInventory = getInventory(newMember);
          let oldInventory = getInventory(oldMember);
          let diff = newInventory.filter(r => !oldInventory.has(r));
          if (diff.size > 0) {
            newMember.send(`You have new color-equippable ${diff.size > 1 ? "roles" : "role"} ${diff.map(r => `**${newMember.guild.roles.cache.get(r).name}**`).join(", ")}! You can equip the colors with the \`!equip\` command. Check \`!inventory\` command in #bot-lobby to see what colors you can equip.`).catch(u.noop);
          }
        }
        await Module.db.user.updateRoles(newMember);
      } catch(error) { u.errorHandler(error, "Update Roles on Role Add"); }
    } else if (newMember.roles.cache.size < oldMember.roles.cache.size) {
      // Role removed
      try {
        let newInventory = getInventory(newMember);
        let oldInventory = getInventory(oldMember);
        let diff = oldInventory.filter(r => !newInventory.has(r));
        if (diff.size > 0) await newMember.roles.remove(Array.from(diff.values()));
        await Module.db.user.updateRoles(newMember);
      } catch(error) { u.errorHandler(error, "Update Roles on Role Remove"); }
    }
  }
})
.addEvent("loadConfig", async () => {
  try {
    let rows = await Module.config.sheets.get("Opt-In Roles").getRows();
    roles.clear();
    for (let row of rows)
    roles.set(row["Role Tag"], row["RoleID"]);
    Module.client.commands.find(c => c.name == "add").info = "Gives you one of the following roles:\n```md\n* " + Array.from(roles.keys()).join("\n* ") + "```";
    Module.client.commands.find(c => c.name == "remove").info = "Remove one of the following roles:\n```md\n* " + Array.from(roles.keys()).join("\n* ") + "```";

    const fs = require("fs");
    const roleData = {};
    for (const [tag, roleId] of roles) {
      roleData[tag] = roleId;
    }
    fs.writeFileSync("./storage/roleInfo.json", JSON.stringify(roleData));
  } catch(error) { u.errorHandler(error, "Roles loadConfig"); }
})
.setUnload(() => {
  const path = require("path");
  delete require.cache[require.resolve(path.resolve(process.cwd(), "./utils/roleColors.js"))];
});

module.exports = Module;
