const Augur = require("augurbot");
const u = require("../utils/utils");
const request = require("request-promise-native");

const Module = new Augur.Module()
.addCommand({name: "extralife",
  description: "Check the LDSG Extra Life Goal",
  permissions: msg => msg.guild && msg.guild.id == Module.config.ldsg,
  process: async (msg) => {
    try {
      let response = await request("https://extralife.donordrive.com/api/teams/51868/participants").catch(() => {
        msg.reply("there seems to be an issue with the Extra Life API. Please try again in a few minutes").then(u.clean);
      });
      if (response) {
        let team = JSON.parse(response);
        team.sort((a, b) => (a.sumDonations != b.sumDonations ? b.sumDonations - a.sumDonations : a.displayName.localeCompare(b.displayName)));
        let total = 0;
        let embed = u.embed().setColor(0x7fd836);
        for (let i = 0; i < Math.min(team.length, 25); i++) {
          let member = team[i];
          embed.addField(member.displayName, `$${member.sumDonations} / $${member.fundraisingGoal} (${Math.round(100 * member.sumDonations / member.fundraisingGoal)}%)\n[[Donate]](${member.links.donate})${(member.streamIsLive ? `\n[[STREAM NOW LIVE]](${member.links.stream})` : "")}`, true);
          total += member.sumDonations;
        }
        embed.setTitle("LDSG Extra Life Team")
        .setDescription(`LDSG is raising money for Extra Life! We are currently at $${total} of our team's $2,500 goal for 2020. That's ${Math.round(100 * total / 2500)}% there!\n\nYou can help by donating to one of the Extra Life Team below.`);
        msg.channel.send({embed});
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
});

module.exports = Module;
