// Message GuyInGrey if this command has issues!

const Augur = require("augurbot"),
  u = require("../utils/utils"),
  elite = require("../utils/eliteDangerousAPI"),
  fs = require("fs");

const galnetDataFile = "data/eliteNews.txt";
let lastGalnetArticleTitle = "";

async function updateFactionStatus() {
  let channelID = "549808289811267602";
  let channel = Module.client.channels.cache.get(channelID);
  try {
    let starSystem = await elite.getSystemInfo("LDS 2314").catch(u.noop);
    if (starSystem) {
      let faction = starSystem.factions.find(f => f.name === "LDS Enterprises");
      let influence = Math.round(faction.influence * 10000) / 100;

      // Discord has a topic size limit of 250 characters, but this will never pass that.
      let topic = `[LDS 2314 / LDS Enterprises]  Influence: ${influence}% - State: ${faction.state} - LDS 2314 Controlling Faction: ${starSystem.information.faction}`;

      channel.setTopic(topic);
    }
  } catch (e) { u.errorHandler(e, "Elite Channel Update Error"); }

  let latestArticle;
  try {
    // Galnet articles
    latestArticle = await elite.getGalnetFeed().catch(u.noop);
    if (!latestArticle) { return; }
    if (latestArticle[0].title !== lastGalnetArticleTitle) {
      latestArticle = latestArticle[0];

      try {
        let content = latestArticle.content.replace(/<br \/>/g, "\n");

        let embed = u.embed()
          .setThumbnail("https://i.imgur.com/Ud8MOzY.png")
          .setAuthor("GALNET", "https://vignette.wikia.nocookie.net/elite-dangerous/images/c/cd/Official-Galnet-Logo.png")
          .setTitle(latestArticle.title)
          .setURL("https://community.elitedangerous.com/")
          .setDescription((content.length > 2040 ? content.substr(0, 2040) + "..." : content));
        channel.send({ embed });

        // Don't record 503 errors. This will prevent double posting of the same article.
        if (latestArticle.title === "Communication error...") { return; }

        lastGalnetArticleTitle = latestArticle.title;
        fs.writeFile(galnetDataFile, lastGalnetArticleTitle, function (err) {
          if (err) {
            u.errorHandler(err, "Failed to update `" + galnetDataFile + "` with latest article title, `" + lastGalnetArticleTitle + "`");
          }
        });
      } catch (e) { u.errorHandler(e, "Elite Galnet Posting Error"); }
    }
  } catch (e) { u.errorHandler(e, "Elite Galnet Capture Error"); return; }
}

const Module = new Augur.Module()
.addCommand({
  name: "elite",
  description: "Elite Dangerous information. Use `!elite help` for more.",
  syntax: "help | status | system [system] | stations [system] | factions [system] | bodies [system]",
  info: "See `!elite help` for more information.",
  aliases: [],
  process: async (msg, suffix) => {
    try {
      let [command, ...params] = suffix.split(" ");
      command = command.toLowerCase();
      let remainder = params.join(" ");

      let embed = u.embed()
        .setThumbnail("https://i.imgur.com/Ud8MOzY.png")
        .setAuthor("EDSM", "https://i.imgur.com/4NsBfKl.png");

      if (command === "status") {
        let status = await elite.getEliteStatus();
        var message = `The Elite: Dangerous servers are ${(status.type === "success" ? "online" : "offline")}.`;
        msg.channel.send(message);
        return;
        //
        // Help
        //
      } else if (command === "help") {
        embed.addField("Get Elite's Server Status", "!elite status");
        embed.addField("Get The In-Game Time", "!elite time");
        embed.addField("Get System Information", "!elite system **System Name**");
        embed.addField("Get Stations in a System", "!elite stations **System Name**\n(Note: Will not show Fleet Carriers)");
        embed.addField("Get Factions in a System", "!elite factions **System Name**");
        embed.addField("Get Celestial Bodies in a System", "!elite bodies **System Name**");

        msg.channel.send({ embed });
        return;
      } else if (command === "time") {
        let d = new Date();
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];

        msg.channel.send(`The current date/time in Elite is ${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}, ${(d.getUTCFullYear() + 1286)}, ${d.getUTCHours()}:${d.getUTCMinutes()}. (UTC + 1286 years)`);
        return;
      }

      let starSystem = await elite.getSystemInfo(remainder);
      if (!starSystem) {
        msg.channel.send("I couldn't find a system with that name.").then(u.clean);
        return;
      }

      if (command === "system") {
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

        embed.setTitle(starSystem.name)
          .setURL(starSystem.stationsURL);

        let stationList = new Map();

        let i = 0;
        for (let station of starSystem.stations) {
          // Filtering out fleet carriers. There can be over 100 of them (spam) and their names are user-determined (not always clean).
          if (station.type === "Fleet Carrier" || station.type === "Unknown") { continue; }
          if (++i + stationList.size > 24) break;

          if (!stationList.has(station.type)) stationList.set(station.type, []);
          stationList.get(station.type).push(station);
        }

        for (const [stationType, stations] of stationList) {
          embed.addField(stationType, "-----------------------------");

          for (let station of stations) {
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
        if (i + stationList.size > 24) {
          embed.setFooter("Some stations were filtered out because the limit was exceeded.", "https://i.imgur.com/vYPj8iX.png");
        }

        msg.channel.send({embed});
        //
        // Factions
        //
      } else if (command === "factions") {
        if (starSystem.factions.length <= 0) { msg.channel.send("I couldn't find any factions in that system."); return; }

      embed.setTitle(starSystem.name)
        .setURL(starSystem.factionsURL);

      for (let faction of starSystem.factions) {
        let influence = Math.round(faction.influence * 10000) / 100;
        let url = encodeURI("https://www.edsm.net/en/faction/id/" + faction.id + "/name/");
        embed.addField(faction.name + (starSystem.information && (faction.name === starSystem.information.faction) ? " (Controlling)" : "") + " " + influence + "%",
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
          //                                                                                 This double slash is intentional
          let url = encodeURI("https://www.edsm.net/en/system/bodies/id/" + starSystem.id + "//details/idB/" + body.id + "/nameB/");
          let scoopable = body.type === "Star" ? (body.isScoopable ? " (Scoopable)" : " (Not Scoopable)") : "";
          let distance = Math.round(body.distanceToArrival * 10) / 10;
          embed.addField(body.name, body.type + scoopable + "\n" + distance + " ls", true);
        }

        msg.channel.send({ embed });
      } else {
        msg.channel.send("I didn't understand that command. See `!elite help`.").then(u.clean);
      };
    } catch (error) { u.errorHandler(error, msg); }
  }
})
.addEvent("ready", updateFactionStatus)
.setClockwork(() => {
    try {
      // Every 6 hours seems alright for channel description updates. The rate limit is actually once every 5 minutes, so we're more than clear.
      return setInterval(updateFactionStatus, 6 * 60 * 60 * 1000);
    } catch (e) { u.errorHandler(e, "Elite Dangerous Clockwork Error"); }
})
.setInit(() => {
  try {
    lastGalnetArticleTitle = fs.readFileSync(galnetDataFile, 'utf8');
  } catch (error) {
    u.errorHandler(error, "Error reading `" + galnetDataFile + "`");
  }
})
.setUnload(() => {
  const path = require("path");
  delete require.cache[require.resolve(path.resolve(process.cwd(), "./utils/eliteDangerousAPI.js"))];
});

module.exports = Module;
