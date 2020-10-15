const Augur = require("augurbot"),
  u = require("../utils/utils"),
  champions = require("../data/champions.json");

const Module = new Augur.Module()
.addCommand({name: "bracket",
  description: "Find upcoming LDSG tournaments.",
  aliases: ["tournament", "tournaments", "tourneys", "tourney", "challonge", "brackets"],
  category: "Tournaments",
  process: async (msg) => {
    try {
      let challonge = require("../utils/Challonge").init(Module.config.api.challonge);
      let embed = u.embed();

      embed.setDescription("Upcoming and Current LDSG Tournaments");

      let responses = await Promise.all([
        challonge.getTournamentsIndex({state: "pending", subdomain: "ldsg"}),
        challonge.getTournamentsIndex({state: "in_progress", subdomain: "ldsg"})
      ]);

      let now = new Date();

      let tournaments = responses.reduce((full, response) => full.concat(response), []);

      tournaments.sort((a, b) => (new Date(a.tournament.start_at)).valueOf() - (new Date(b.tournament.start_at).valueOf()));

      for (let tournament of tournaments) {
        let displayDate = (tournament.tournament.start_at ? new Date(tournament.tournament.start_at.substr(0, tournament.tournament.start_at.indexOf("T"))) : "Unscheduled");
        if (typeof displayDate != "string") displayDate = displayDate.toLocaleDateString("en-us");

        embed.addField(displayDate, `[${tournament.tournament.name}](${tournament.tournament.full_challonge_url})`);
      }

      if (embed.fields.length == 0) embed.addField("Community Tournaments", "No upcoming community tournaments found.");
      else embed.description += "\n\nCommunity Tournaments:";
      msg.channel.send({embed});
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "champion",
  description: "Declare an LDSG Champion!",
  syntax: "<@user(s)> <Tournament Name>",
  category: "Tournaments",
  process: (msg, suffix) => {
    let path = require("path");
    let fs = require("fs");

    u.clean(msg);
    let reason = suffix.replace(/<@!?\d+>/g, "").trim();
    if ((msg.mentions.members.size > 0) && (reason.length > 0)) {
      for (let [memberId, member] of msg.mentions.members) {
        member.addRole("490580944009297945");
        champions[member.id] = new Date(Date.now() + (3 * 7 * 24 * 60 * 60 * 1000));
      }
      fs.writeFile(path.resolve(process.cwd(), "./data/champions.json"), JSON.stringify(champions), (error) => {
        if (error) u.errorHandler(error, "Champions Update");
        else msg.react("👌");
      });
      msg.guild.channels.cache.get("121752198731268099").send(`Congratulations to our new tournament champions, ${Array.from(msg.mentions.members.values()).join(", ")}!\n\nTheir performance landed them the champion slot in the ${reason}, and they'll hold on to the LDSG Tourney Champion role for a few weeks.`);
    } else
      msg.reply("you need to tell me who to give the Tourney Champion role and the tournament name!").then(u.clean);
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.roles.cache.has(Module.config.roles.team))
})
.addCommand({name: "participant",
  description: "Add or remove members from the Tournament Paricipant role",
  syntax: "add <@user> | remove <@user> | clean",
  category: "Tournaments",
  process: async (msg, suffix) => {
    try {
      let role = "309889475633348608";
      u.clean(msg);
      if ((suffix.toLowerCase() == "clean")) {
        for (const [memberId, member] of msg.guild.roles.cache.get(role).members) {
          member.roles.remove(role);
        }

        let messages = await msg.channel.fetchMessages({limit:1000});
        msg.channel.bulkDelete(messages, true);
        msg.react("👌");
      } else if (msg.mentions.members.size == 0) {
        msg.reply("you need to tell me who to add or remove.").then(u.clean);
      } else if (suffix.toLowerCase().startsWith("add")) {
        for (let [memberId, member] of msg.mentions.members)
          await member.roles.add(role);
        msg.react("👌");
      } else if (suffix.toLowerCase().startsWith("remove")) {
        for (let [memberId, member] of msg.mentions.members)
          await member.roles.remove(role);
        msg.react("👌");
      } else {
        msg.reply("you need to tell me whether to add or remove the user to the channel.").then(u.clean);
      }
    } catch(error) { u.errorHandler(error, msg); }
  },
  permissions: (msg) => (msg.guild && (msg.member.roles.cache.has(Module.config.roles.team)))
});

module.exports = Module;
