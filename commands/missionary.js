const Augur = require("augurbot"),
  u = require("../utils/utils");

function parseMission(str) {
  let date = new RegExp("(" + [
    "january", "jan",
    "february", "feb",
    "march", "mar",
    "april", "apr",
    "may",
    "june", "jun",
    "july", "jul",
    "august", "aug",
    "september", "sept", "sep",
    "october", "oct",
    "november", "nov",
    "december", "dec"
  ].join("|") + ") 20\\d\\d", "i");

  let email = /\w+(\.?\w+)*@\w+(\.\w+)+/;
  let discord = /<@!?(\d+)>/;

  let discordId = discord.exec(str);
  if (discordId) discordId = discordId[1];
  else return {error: "I couldn't find a Discord ID"};

  let address = email.exec(str);
  if (address) address = address[0];
  else return {error: "I couldn't find an email address"};

  let homecoming = date.exec(str);
  if (homecoming) homecoming = u.properCase(homecoming[0]);

  let mission = u.properCase(str.replace(discord, "").replace(date, "").replace(email, "").trim());

  return {
    discordId: discordId,
    email: address,
    mission: mission,
    returns: homecoming
  };
};

const Module = new Augur.Module()
.addCommand({name: "newmission",
  syntax: "@user email@myldsmail.net <mission> <month year>",
  description: "Add a new missionary to the database",
  hidden: true,
  category: "Mission",
  permissions: (msg) => Module.config.adminId.includes(msg.author.id),
  process: (msg, suffix) => {
    let missionData = parseMission(suffix);
    if (missionData.error) msg.reply(missionData.error).then(u.clean);
    else {
      Module.db.mission.dave(missionData).then(mission => {
        msg.guild.fetchMember(missionData.discordId).then(member => {
          if (member) msg.channel.send(`Saved data for **${member.displayName}**`).then(u.clean);
        });
      });
    }
  }
})
.addCommand({name: "missionreturn",
  syntax: "@user",
  description: "Remove a user from the missionary list",
  hidden: true,
  category: "Mission",
  permissions: (msg) => Module.config.adminId.includes(msg.author.id),
  process: (msg) => {
    msg.mentions.users.forEach(user => {
      Module.db.mission.delete(user.id).then(() => {
        msg.reply(`I removed ${user.username} from the missionary list!`).then(u.clean);
      });
    });
  }
})
.addCommand({name: "missionaries",
  description: "Displays LDSG Missionaries (that we know about)",
  category: "Mission",
  hidden: true,
  process: (msg) => {
    Module.db.mission.findAll().then(missionaries => {
      Promise.all(missionaries.map(m => msg.guild.fetchMember(m.discordId))).then(members => {
        members = members.map((m, i) => `**${m.displayName}**: ${missionaries[i].mission} Mission, returns ${missionaries[i].returns}`);
        msg.channel.send("**Current LDSG Missionaries:**\n" + members.join("\n"));
      });
    });
  }
});

module.exports = Module;
