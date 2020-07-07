// Message GuyInGrey if this command has issues!

const Augur = require("augurbot"),
  u = require("../utils/utils"),
  elite = require("../utils/eliteDangerousAPI");

const Module = new Augur.Module()
.addCommand({name: "elite",
  description: "Elite Dangerous information. Use `!elite help` for more.",
  syntax: "See `!elite help`",
  aliases: [],
  process: async (msg, suffix) => {
    try {
      let [command, ...params] = suffix.split(" ");
      let remainder = params.join(" ");
      switch (command) {
        // Returns help for subcommands.
        // Will be added once the rest is done.
        case "help":
          msg.channel.send("Not *yet* implemented. I might work faster if you give me a <:buttermelon:305039588014161921>");
          break;
        case "system":
          let starSystem = await elite.getSystemInfo(remainder);
          if (!starSystem) { msg.channel.send("I couldn't find a system with that name."); return; }

          let embed = u.embed()
            .setThumbnail("https://i.imgur.com/Ud8MOzY.png")
            .setTitle(starSystem.name)
            .setURL("https://www.edsm.net/en/system/id/" + starSystem.id + "/name/")
            .addField("Permit Required?", starSystem.requirePermit ? "Yes" : "No", true)
            .setAuthor("EDSM", "https://i.imgur.com/4NsBfKl.png");

          if (starSystem.primaryStar) {
            embed.addField("Star Scoopable", starSystem.primaryStar.isScoopable ? "Yes" : "No", true);
          }

          if (starSystem.information) {
            embed.addField("Controlling Faction", starSystem.information.faction, true).
              addField("Government Type", starSystem.information.allegiance + " - " + starSystem.information.government, true);
          } else {
            embed.addField("Uninhabited System", "No faction information available.", true);
          }

          msg.channel.send({embed});
          break;
        case "stations":
          let starSystem = await elite.getSystemInfo(remainder);
          if (!starSystem) { msg.channel.send("I couldn't find a system with that name."); return; }
          if (starSystem.stations.length <= 0) { msg.channel.send("I couldn't find any stations in that system."); return; }

          let embed = u.embed()
            .setThumbnail("https://i.imgur.com/Ud8MOzY.png")
            .setTitle(starSystem.name)
            .setURL(starSystem.stationsURL)
            .setAuthor("EDSM", "https://i.imgur.com/4NsBfKl.png");

          for (let station of starSystem.stations) {
            let stationURL = "https://www.edsm.net/en/system/stations/id/" + starSystem.id + "/name/" + starSystem.name + "/details/idS/" + station.id + "/";
            let faction = "";
            if (station.controllingFaction) {
              faction = " - " + station.controllingFaction.name;
            }

            embed.addField(station.name, "[**" + station.type + "** - " + station.distanceToArrival + " LS" + faction + "](" + stationURL + ")");
          }

          msg.channel.send({ embed });
          break;
        default:
          msg.channel.send("I didn't understand that command. See `!elite help`.").then(u.clean);
      }
    } catch(error) { u.alertError(error, msg); }
  }
});

module.exports = Module;
