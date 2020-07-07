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

      if (command === "status") {
        let status = elite.getEliteStatus();
        var message = "The Elite: Dangerous servers are " + (status.type === "success" ? "online." : "offline.");
        msg.channel.send(message);
        return;
      }

      let starSystem = await elite.getSystemInfo(remainder);
      if (!starSystem) {
        msg.channel.send("I couldn't find a system with that name.").then(u.clean);
        return;
      }

      let embed = u.embed()
        .setThumbnail("https://i.imgur.com/Ud8MOzY.png")
        .setAuthor("EDSM", "https://i.imgur.com/4NsBfKl.png")

      //
      // Help
      //
      if (command === "help") {
        embed.addField("Get Elite's Server Status", "!elite status");
        embed.addField("Get System Information", "!elite system **Systen Name**");
        embed.addField("Get Stations in a System", "!elite stations **Systen Name**\n(Note: Will not show Fleet Carriers)");
        embed.addField("Get Factions in a System", "!elite factions **Systen Name**");
        embed.addField("Get Celestial Bodies in a System", "!elite bodies **Systen Name**");

        msg.channel.send({ embed });
      //
      // System
      //
      } else if (command === "system") {
        embed.setTitle(starSystem.name)
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

        msg.channel.send({ embed });
      //
      // Stations
      //
      } else if (command === "stations") {
        if (starSystem.stations.length <= 0) { msg.channel.send("I couldn't find any stations in that system."); return; }

        let embed = u.embed()
          .setThumbnail("https://i.imgur.com/Ud8MOzY.png")
          .setTitle(starSystem.name)
          .setAuthor("EDSM", "https://i.imgur.com/4NsBfKl.png")
          .setURL(starSystem.stationsURL);

        let stationList = {};

        let i = 0;
        for (let station of starSystem.stations) {
          // Filtering out fleet carriers. There can be over 100 of them (spam) and their names are user-determined (not always clean).
          if (station.type === "Fleet Carrier" || station.type === "Unknown") { continue; }
          i++; if (i > 25) { continue; }

          if (!stationList[station.type]) {
            stationList[station.type] = [];
          }
          stationList[station.type].push(station);
        }

        for (let stationType in stationList) {
          embed.addField(stationType, "-----------------------------");

          for (let station of stationList[stationType]) {
            let stationURL = "https://www.edsm.net/en/system/stations/id/" + starSystem.id + "/name/" + starSystem.name + "/details/idS/" + station.id + "/";
            let faction = "";
            // Rounding to one decimal
            let distance = Math.round(station.distanceToArrival * 10) / 10;
            if (station.controllingFaction) {
              faction = station.controllingFaction.name;
            }

            embed.addField(faction, "[" + station.name + "](" + encodeURI(stationURL) + ")\n" + distance + " ls", true);
          }
        }

        // Letting the user know there were more than 25
        if (i > 25) {
          embed.setFooter("Some stations were filtered out because the limit was exceeded.", "https://i.imgur.com/vYPj8iX.png");
        }

        msg.channel.send({ embed });
      //
      // Factions
      //
      } else if (command === "factions")
      {
        if (starSystem.factions.length <= 0) { msg.channel.send("I couldn't find any factions in that system."); return; }

        embed.setTitle(starSystem.name)
          .setURL(starSystem.factionsURL);

        for (let faction of starSystem.factions) {
          let influence = Math.round(faction.influence * 10000) / 100;
          let url = encodeURI("https://www.edsm.net/en/faction/id/" + faction.id + "/name/");
          embed.addField(factions.name + (faction.name === starSystem.controllingFaction.name ? " (Controlling)" : "") + " " + influence + "%",
            "State: " + faction.state + "\nGovernment: " + faction.allegiance + " - " + faction.government + "\n[Link](" + url + ")", true);
        }

        msg.channel.send({ embed });
      //
      // Bodies
      //
      } else if (command === "bodies") {
        if (starSystem.bodies.length <= 0) { msg.channel.send("I couldn't find any bodies in that system."); return; }

        embed.setTitle(starSystem.name)
          .setURL(starSystem.bodiesURL);

        for (let body of starSystem.bodies) {
          //                                                                                 Yes, this double slash is intentional
          let url = encodeURI("https://www.edsm.net/en/system/bodies/id/" + starSystem.id + "//details/idB/" + body.id + "/nameB/");
          let scoopable = body.type === "Star" ? (body.isScoopable ? " (Scoopable)" : " (Not Scoopable)") : "";
          let distance = Math.round(body.distanceToArrival * 10) / 10;
          embed.addField(body.name, body.type + scoopable + "\n" + distance + " ls");
        }

        msg.channel.send({ embed });
      } else {
        msg.channel.send("I didn't understand that command. See `!elite help`.").then(u.clean);
      }
    } catch(error) { u.alertError(error, msg); }
  }
});

module.exports = Module;
