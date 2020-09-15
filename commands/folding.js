const Augur = require("augurbot");
const request = require("request");
const u = require("../utils/utils");

const attempts = new Set();

function getStats(channel) {
  if (attempts.size == 0) return Promise.resolve(true);
  else return new Promise((fulfill, reject) => {
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

          for (const channel of attempts) {
            Module.client.channels.cache.get(channel).send({embed}).catch(e => u.errorHandler(e, "F@H Post"));
          }
          attempts.clear();
          fulfill(true);
        } else {
          fulfill(false);
        }
      } catch(error) { u.errorHandler(error, "F@H Posting"); }
    });
  });
}

const Module = new Augur.Module()
.addCommand({name: "fah",
  aliases: ["foldingathome", "folding", "folding@home"],
  description: "LDSG Folding@home Stats",
  process: async (msg) => {
    try {
      attempts.add(msg.channel.id);
      let success = await getStats(msg.channel);
      if (!success)
        msg.channel.send("I'm having trouble connecting to the Folding @ Home website. I'll keep trying!");
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.setClockwork(() => {
  try {
    return setInterval(getStats, 10 * 60000);
  } catch(error) { u.errorHandler(error, "F@H Clockwork"); }
})
.setUnload(() => {
  attempts.clear();
});

module.exports = Module;
