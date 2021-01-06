const Augur = require("augurbot"),
  request = require("request"),
  cheerio = require("cheerio"),
  parseXML = require("xml2js").parseString,
  u = require("../utils/utils");

function boostCheck(channel){
      if(guild.premiumSubscriptionCount < 30) Module.client.channels.cache.get(channel).send(`We've dropped to ${guild.premiumSubscriptionCount} boosts (30 required for tier 3)`)
  }

const Module = new Augur.Module()
.addCommand({name: "code",
  description: "Our Code of Conduct",
  aliases: ["tos", "terms"],
  category: "LDSG",
  process: (msg) => {
    msg.channel.send("Please read our Code of Conduct:\nhttp://ldsgamers.com/code-of-conduct").catch(e => u.errorHandler(e, msg));
  }
})
.addCommand({name: "donate",
  description: "Help us out!",
  category: "LDSG",
  aliases: ["patreon", "paypal", "venmo"],
  process: (msg) => {
    let embed = u.embed()
      .setTitle("Donate to LDSG")
      .setDescription("Interested in helping out?\nDonations are used to help fund game servers, giveaways, and other benefits for the community.")
      .addField("Patreon - Recurring Donation", "[Donate on Patreon](https://patreon.com/LDSGamers)")
      .addField("PayPal - One-time Donation", "[Donate on PayPal](https://paypal.me/LDSGToast)")
      .addField("Venmo - One-time Donation", "[Donate on Venmo](https://venmo.com/LDSGamers) Code: `5374`");
    msg.channel.send({embed}).catch(e => u.errorHandler(e, msg));
  }
})

/*
Figured this file should also be cleaned up and stuff be put in tags. For reference, i've included the tag names and content, seperated by a -
invite - Use this link to invite a friend to our server:\n<http://ldsg.io/chat>
mcstore - Check out our Minecraft store for some cosmetics!\nhttp://ldsgamers.buycraft.net/
site - Check out our site!\nhttp://LDSGamers.com
snapchat - **Follow LDSG on Snapchat!**", file: https://cdn.discordapp.com/attachments/193042027066163200/277968968214511616/snapchat.jpg
store/shop - Check out the new store!\n<https://ldsgamers.com/shop>
team/staff - Get to know the LDSG Team!\nhttp://LDSGamers.com/about/staff
videos - The LDSG YouTube Channel, featuring Let's Plays, Clips of the Week, and more:\nhttps://www.youtube.com/ldsgamers
*/

.addCommand({name: "map",
  description: "View and join the LDSG member map!",
  category: "LDSG",
  permissions: (msg) => msg.guild && msg.guild.id == Module.config.ldsg,
  process: (msg) => {
    let vvo = ((msg.guild && (msg.guild.id == Module.config.ldsg)) ? msg.guild.members.cache.get("114484697916112904").displayName : "vadervanodin");
    let response = [
      "**View the LDSG Member Map:**",
      "https://www.mapcustomizer.com/map/LDS%20Gamers"
    ];
    if (vvo) response.push("\n**To be added to the LDSG Member Map:**", "Message " + vvo + " with your general whereabouts.");
    msg.channel.send(response.join("\n")).catch(e => u.errorHandler(e, msg));
  }
})
.addCommand({name: "podcast",
  description: "Link to the most recent LDSG Podcast on iTunes",
  category: "LDSG",
  process: (msg) => {
    let url = "http://www.ldsgamers.com/feed";
    request(url, function(error, response, body){
      if (!error && response.statusCode == 200) {
        parseXML(body, function(err, xml) {
          let podcast = xml.rss.channel[0].item[0];
          let date = new Date(podcast.pubDate);
          try {
            var $ = cheerio.load(podcast);
          } catch(e) { u.errorHandler(e, msg); }
          let description = podcast["itunes:summary"][0].trim();
          let links = ["• [iTunes](https://itunes.apple.com/us/podcast/lds-gamers-the-lds-gaming-community/id1092872516)"];
          if (podcast.enclosure)
            links.push(`• [Direct Download](${podcast.enclosure[0]["$"].url})`);

          let embed = u.embed()
            .setTitle(podcast.title)
            .setAuthor("LDSG Podcast")
            .setDescription(description)
            .setThumbnail(xml.rss.channel[0]["itunes:image"][0]['$'].href)
            .setTimestamp(date)
            .setURL("https://itunes.apple.com/us/podcast/lds-gamers-the-lds-gaming-community/id1092872516")
            .addField("Download", links.join("\n"), true);
          msg.channel.send(embed);
        });
      } else {
        if (error) u.errorHandler(error, msg);
        msg.channel.send("Sorry, I ran into an error fetching the podcast.")
          .then(u.clean).catch(e => u.errorHandler(e, msg));
      }
    });
  }
})
.setClockwork(()=>{
    try{
        return setInterval(boostCheck(Module.config.channels.modlogs), 1000 * 60 * 60 * 24)
    } catch(error){u.errorHandler(error, 'Boost Check Clockwork Error')}
})

module.exports = Module;
