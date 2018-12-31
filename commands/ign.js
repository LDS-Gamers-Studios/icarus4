const Augur = require("augurbot"),
  Ign = require("../utils/IgnInfo"),
  u = require("../utils/utils");

function embedIGN(user, igns) {
	if (igns.length > 0) {
    let embed = u.embed()
    .setAuthor(user.name, user.avatar);

    if (igns.length > 1) embed.setTitle('IGNs for ' + user.name);

		let hasLink = /(http(s?):\/\/)?(\w+\.)+\w+\//ig;

    Ign.categories.forEach(category => {
      igns
      .filter(ign => Ign.gameids.get(ign.system).category == category)
      .sort((a, b) => Ign.gameids.get(a.system).name.localeCompare(Ign.gameids.get(b.system).name))
      .forEach(ign => {
        let name = ign.ign;
        if (Ign.aliases[ign.system]) ign.system = Ign.aliases[ign.system];
        if (Ign.gameids.get(ign.system).link && !hasLink.test(name)) name = `[${name}](${Ign.gameids.get(ign.system).link}${encodeURIComponent(name)})`;
        embed.addField(Ign.gameids.get(ign.system).name, name, true);
      });
    });

		return embed;
	} else return false;
};

const Module = new Augur.Module()
.addCommand({name: "ign",
	description: "View an IGN",
	syntax: "[@user] [system]",
	info: "Displays various game system IGNs or social network names that have been added via the `!addign` command. Use the `!whoplays` command to view all people who have saved IGNs for a particular system.\n" + Ign.helpList(),
	category: "IGN",
	process: async function(msg, suffix) {
    try {
      let userMentions = u.userMentions(msg);
      if (userMentions) {
        var user = userMentions.first();
        var systems = suffix.replace(/<@!?\d+>/ig, '').toLowerCase().trim();
      } else {
        var user = u.getUser(msg, suffix);
        var systems = (user.id == msg.author.id ? suffix : null);
      }

      let member = ((msg.guild) ? (msg.guild.members.get(user.id)): null);
      systems = (systems ? systems.split(' ').map(s => (Ign.aliases[s] ? Ign.aliases[s] : s)) : null);
      let igns = await Module.db.ign.find(user.id, systems);

      let embed = embedIGN({name: (member ? member.displayName : user.username), avatar: user.displayAvatarURL}, igns);

      if (embed) msg.channel.send({embed: embed});
      else msg.channel.send("It looks like " + (member ? member.displayName : user.username) + " hasn't saved an IGN with `!addign` yet.").then(u.clean);
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
	}
})
.addCommand({name: "addign",
	description: "Save an IGN",
	syntax: "<system> <ign>",
	info: "Saves various game system IGNs or social network names. User IGNs are visible with the `!ign` command, and lists of users with the `!whoplays` command.\n" + Ign.helpList(),
	aliases: ["adding"],
	category: "IGN",
	process: async function(msg, suffix) {
    try {
      if (!suffix) {
        msg.channel.send("You need to tell me a system and a name.").then(u.clean);
        return;
      }

      let name = suffix.split(" ");
      let system = name.shift().toLowerCase();
      if (name.length < 1) {
        let ign = await Module.db.ign.delete(msg.author.id, system);
        if (ign) msg.channel.send(`Removed IGN "${ign.ign}" for ${ign.system}`).then(u.clean);
        return;
      }
      name = name.join(" ");
      if (Ign.aliases[system]) system = Ign.aliases[system];
      if (Ign.gameids.get(system)) {
        if (system == "birthday") {
          try {
            let bd = new Date(name);
            if (bd == 'Invalid Date') {
              msg.reply("I couldn't understand that date. Please use Month Day format (e.g. Apr 1 or 4/1).");
              return;
            } else {
              let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
              name = months[bd.getMonth()] + " " + bd.getDate();
            }
          } catch (e) {
            msg.reply("I couldn't understand that date. Please use Month Day format (e.g. Apr 1 or 4/1).");
            return;
          }
        }
        let ign = await Module.db.ign.save(msg.author.id, system, name);
        Module.handler.execute("ign", msg, system);
      } else msg.channel.send(system + " isn't a valid system.").then(u.clean);
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
	}
})
.addCommand({name: "whoplays",
  description: "List server members who have stored an IGN for a given system.",
	syntax: "<system>",
	info: "Lists server members who have saved IGNs for a given system.\n" + Ign.helpList(),
	aliases: ["whohas", "whoison"],
	category: "IGN",
  permissions: (msg) => msg.guild,
	process: async function(msg, suffix) {
    try {
      if (!suffix) {
        msg.reply("you need to tell me a supported system to search.").then(u.clean);
        return;
      }
      suffix = suffix.toLowerCase();
      if (Ign.aliases[suffix]) suffix = Ign.aliases[suffix];
      if (Ign.gameids.get(suffix)) {
        let users = await Module.db.ign.getList(suffix);
        if (users.length > 0) {
          let guild = msg.guild;

          let wePlay = users
          .filter(u => guild.members.has(u.discordId))
          .sort((a, b) => {
            if (suffix != "birthday")
            return guild.members.get(a.discordId).displayName.toLowerCase().localeCompare(guild.members.get(b.discordId).displayName.toLowerCase())
            else {
              let aDate = new Date(a.ign);
              let bDate = new Date(b.ign);
              return aDate - bDate;
            }
          })
          .map(user => `· **${u.escapeText(guild.members.get(user.discordId).displayName)}**: ${(user.ign.startsWith("http") ? "<" + u.escapeText(user.ign) + ">" : u.escapeText(user.ign))}`);

          msg.channel.send(`The following members have saved an IGN for ${Ign.gameids.get(suffix).name}:\n` + wePlay.join("\n"), { split: true });
        } else msg.channel.send(`No members have saved an IGN for ${Ign.gameids.get(suffix).name}.`);
      } else msg.reply(suffix + " isn't a valid system.").then(u.clean);
    } catch(e) {
      Module.handler.errorHandler(e, msg);
    }
	}
});

module.exports = Module;
