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
      command = command.toLowerCase();
      let remainder = params.join(" ");

      if (command == "help") {
        msg.channel.send("Not *yet* implemented. I might work faster if you give me a <:buttermelon:305039588014161921>");
      } else if (command == "system") {
        let starSystem = await elite.getSystemInfo(remainder);
        if (!starSystem) {
          msg.channel.send("I couldn't find a system with that name.").then(u.clean);
          return;
        }

        let embed = u.embed()
          .setThumbnail("https://i.imgur.com/Ud8MOzY.png")
          .setTitle(starSystem.name)
          .setAuthor("EDSM", "https://i.imgur.com/4NsBfKl.png")
          .setURL("https://www.edsm.net/en/system/id/" + starSystem.id + "/name/")
          .addField("Permit Required?", starSystem.requirePermit ? "Yes" : "No", true);

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
      } else if (command == "stations") {
        let starSystem = await elite.getSystemInfo(remainder);
        if (!starSystem) {
          msg.channel.send("I couldn't find a system with that name.").then(u.clean);
          return;
        }

        if (!starSystem) { msg.channel.send("I couldn't find a system with that name."); return; }
        if (starSystem.stations.length <= 0) { msg.channel.send("I couldn't find any stations in that system."); return; }

        let embed = u.embed()
          .setThumbnail("https://i.imgur.com/Ud8MOzY.png")
          .setTitle(starSystem.name)
          .setAuthor("EDSM", "https://i.imgur.com/4NsBfKl.png")
          .setURL(starSystem.stationsURL);

        for (let station of starSystem.stations.filter((e, i) => i < 25)) {
          // Filtering out fleet carriers. There can be over 100 of them (spam) and their names are user-determined (not always clean).
          if (station.type === "Fleet Carrier") { continue; } 
          let stationURL = "https://www.edsm.net/en/system/stations/id/" + starSystem.id + "/name/" + starSystem.name + "/details/idS/" + station.id + "/";
          let faction = "";
          // Rounding to one decimal
          let distance = Math.round(station.distanceToArrival * 10) / 10;
          if (station.controllingFaction) {
            faction = " - " + station.controllingFaction.name;
          }

          embed.addField(station.name, "[**" + station.type + "** - " + distance + " LS" + faction + "](" + encodeURI(stationURL) + ")");
        }

        msg.channel.send({ embed });
      } else {
        msg.channel.send("I didn't understand that command. See `!elite help`.").then(u.clean);
      }
    } catch(error) { u.alertError(error, msg); }
  }
});

module.exports = Module;
