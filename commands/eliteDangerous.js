const Augur = require("augurbot"),
  u = require("../utils/utils");
const request = require("request-promise-native");

async function getFromAPI(params) {
  try {
    let url = "https://www.edsm.net/api-v1/" + params;
    return JSON.parse(await request(url));
  } catch(error) { u.alertError(error, "Elite Dangerous API Error"); }
}

const Module = new Augur.Module()
.addCommand({name: "elite",
  description: "Elite Dangerous information. Use `!elite help` for more.",
  syntax: "See `!elite help`",
  aliases: [],
  process: async (msg, suffix) => {
    try {
      let [command, ...params] = suffix.split(" ");
      let remainder = params.join(" ");
      switch (command)
      {
        // Returns help for subcommands.
        // Will be added once the rest is done.
        case "help":
          msg.channel.send("Not *yet* implemented. I might work faster if you give me a <:buttermelon:305039588014161921>");
          break;
        case "system":
          let starSystem = await getFromAPI("system?showPrimaryStar=1&showInformation=1&showPermit=1&showId=1&systemName=" + remainder);
          if (starSystem && starSystem.name) {
            let embed = u.embed();
            embed.setThumbnail("https://i.imgur.com/Ud8MOzY.png");
            embed.setTitle(starSystem.name);
            if (starSystem.information) {
              embed.addField("Controlling Faction", starSystem.information.faction);
              embed.addField("Government Type", starSystem.information.allegiance + " - " + starSystem.information.government);
            } else {
              embed.addField("Uninhabited System", "No faction information available.");
            }
            embed.addField("Permit Required", starSystem.requirePermit);
            if (starSystem.primaryStar) {
              embed.addField("Star Scoopable", starSystem.primaryStar.isScoopable);
            }
            embed.setURL("https://www.edsm.net/en/system/id/" + starSystem.id + "/name/" + starSystem.name.replace(" ", "+"));
            msg.channel.send({embed});
          } else {
            msg.channel.send("I couldn't find a system with that name.");
          };
          break;
        default:
          msg.channel.send("I didn't understand that command.").then(u.clean);
      }
    } catch(error) { u.alertError(error, "Elite Dangerous API Error"); }
  }
});

module.exports = Module;
