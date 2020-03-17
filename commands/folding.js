const Augur = require("augurbot");
const request = require("request");
const u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "fah",
  aliases: ["foldingathome", "folding", "folding@home"],
  description: "LDSG Folding@home Stats",
  process: (msg) => {
    request("https://stats.foldingathome.org/api/team/238415", async function(error, response, body) {
      try {
        if (!error && response.statusCode == 200) {
          body = JSON.parse(body);
          let embed = u.embed()
          .setTimestamp()
          .setImage(body.credit_cert + "?timestamp=" + Date.now())
          .setTitle(`${body.name} Folding@home Stats`)
          .setURL("https://stats.foldingathome.org/team/238415")
          .setDescription(`The top ${Math.min(25, body.donors.length)} contributors to the LDSG Folding@home team:`);

          let contributors = body.donors.sort((a, b) => b.credit - a.credit);

          for (let i = 0; i < Math.min(25, contributors.length); i++) {
            let contrib = contributors[i];
            embed.addField(`[${contrib}](https://stats.foldingathome.org/donor/${contrib.name})`, `**Work Units:** ${contrib.wus}\n**Credit:** ${contrib.credit}\n**Rank:** ${contrib.rank}`, true);
          }

          msg.channel.send({embed});
        } else if (response.statusCode != 200) {
          msg.channel.send("Sorry, I ran into an error fetching LDSG Folding at Home stats. Try again in a bit.").then(u.clean);
        }
      } catch(error) { u.alertError(error, msg); }
    })
  }
});

module.exports = Module;
