const Augur = require("augurbot");
const request = require("request");
const u = require("../utils/utils");

const attempts = new Map();

function getStats(channel) {
  return new Promise((fulfill, reject) => {
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
            embed.addField(contrib.name, `**Profile:** [[Link]](https://stats.foldingathome.org/donor/${contrib.name})\n**Work Units:** ${contrib.wus}\n**Credit:** ${contrib.credit}${(contrib.rank ? "\n**Rank:** " + contrib.rank : "")}`, true);
          }

          for (const [channel, interval] of attempts) {
            Module.handler.client.channels.get(channel).send({embed}).catch(e => u.alertError(e, "F@H Post"));
            clearInterval(interval);
          }
          attempts.clear();
          fulfill(true);
        } else {
          fulfill(false);
        }
      } catch(error) { u.alertError(error, "F@H Posting"); }
    });
  });
}

function postStats(embed) {
}

const Module = new Augur.Module()
.addCommand({name: "fah",
  aliases: ["foldingathome", "folding", "folding@home"],
  description: "LDSG Folding@home Stats",
  process: async (msg) => {
    try {
      if (attempts.has(msg.channel.id)) clearInterval(attempts.get(msg.channel.id));
      attempts.set(msg.channel.id, setInterval(getStats, 60000, msg.channel));
      let success = await getStats(msg.channel);
      if (!success)
        msg.channel.send("I'm having trouble connecting to the Folding @ Home website. I'll keep trying!");
    } catch(e) { u.alertError(e, msg); }
  }
})
.setUnload(() => {
  for (const [channel, interval] of attempts) {
    clearInterval(interval);
  }
  attempts.clear();
});

module.exports = Module;
