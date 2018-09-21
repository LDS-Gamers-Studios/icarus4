const Augur = require("augurbot"),
  request = require("request"),
  cheerio = require("cheerio"),
  parseXML = require("xml2js").parseString,
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "code",
	description: "Our Code of Conduct",
	aliases: ["coc", "tos", "terms"],
	category: "LDSG",
	process: (msg) => {
		msg.channel.send("Please read our Code of Conduct:\nhttp://ldsgamers.com/code-of-conduct").catch(Module.handler.errorHandler);
	}
})
.addCommand({name: "donate",
	description: "Help us out!",
	category: "LDSG",
	process: (msg) => {
		let	embed = u.embed()
			.setTitle("Donate to LDSG")
			.setDescription("Interested in helping out?\nDonations are used to help fund game servers, giveaways, and other benefits for the community.")
			.addField("Patreon - Recurring Donation", "[Donate on Patreon](https://patreon.com/LDSGamers)")
			.addField("PayPal - One-time Donation", "[Donate on PayPal](https://paypal.me/LDSGamers)")
			.addField("Venmo - One-time Donation", "[Donate on Venmo](https://venmo.com/LDSGamers)");
		msg.channel.send({embed: embed}).catch(Module.handler.errorHandler);
	}
})
.addCommand({name: "invite",
	description: "Get the link to invite someone to our Discord server",
	category: "LDSG",
	process: (msg) => {
		msg.channel.send("Use this link to invite a friend to our server:\n<http://ldsg.io/chat>");
	}
})
.addCommand({name: "map",
	description: "View and join the LDSG member map!",
	category: "LDSG",
	process: (msg) => {
		let vvo = ((msg.guild && (msg.guild.id == "96335850576556032")) ? msg.guild.members.get("114484697916112904").displayName : "vadervanodin");
		let response = [
			"**View the LDSG Member Map:**",
			"https://www.mapcustomizer.com/map/LDS%20Gamers"
		];
		if (vvo) response.push("\n**To be added to the LDSG Member Map:**", "Message " + vvo + " with your general whereabouts.");
		msg.channel.send(response.join("\n")).catch(Module.handler.errorHandler);
	}
})
.addCommand({name: "mcstore",
	description: "Get some cosmetics for the Minecraft servers!",
	category: "LDSG",
	process: (msg) => {
		msg.channel.send("Check out our Minecraft store for some cosmetics!\nhttp://ldsgamers.buycraft.net/").catch(Module.handler.errorHandler);
	}
})
.addCommand({name: "podcast",
	description: "Link to the most recent LDSG Podcast on iTunes",
	category: "LDSG",
	process: (msg) => {
		let url = "http://www.ldsgamers.com/feed";
		request(url, function(error, response, body){
			if (!error && response.statusCode==200) {
				parseXML(body, function(err, xml) {
					let podcast = xml.rss.channel[0].item[0];
					let date = new Date(podcast.pubDate);
					try {
						var $ = cheerio.load(podcast);
					} catch(e) { Module.handler.errorHandler(e, msg); }
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
				if (error) Module.handler.errorHandler(error, msg);
				msg.channel.send("Sorry, I ran into an error fetching the podcast.")
					.then(u.clean).catch(Module.handler.errorHandler);
			}
		});
	}
})
.addCommand({name: "site",
	description: "Check out our site!",
	category: "LDSG",
	process: (msg) => {
		msg.channel.send("Check out our site!\nhttp://LDSGamers.com").catch(Module.handler.errorHandler);
	}
})
.addCommand({name: "snapchat",
	description: "Link to LDGS Snapchat",
	category: "LDSG",
	process: (msg) => {
		msg.channel.startTyping();
		msg.channel.send("**Follow LDSG on Snapchat!**", {"file": "https://cdn.discordapp.com/attachments/193042027066163200/277968968214511616/snapchat.jpg"})
			.then(m => {m.channel.stopTyping()}).catch(Module.handler.errorHandler);
	}
})
.addCommand({name: "store",
description: "Check out some cool stuff!",
aliases: ["shop"],
category: "LDSG",
process: (msg) => {
  msg.channel.send("Check out the new store!\n<https://ldsgamers.com/shop>").catch(Module.handler.errorHandler);
}
})
.addCommand({name: "team",
	description: "Get to know the LDSG Team!",
  aliases: ["staff"],
	category: "LDSG",
	process: (msg) => {
		msg.channel.send("Get to know the LDSG Team!\nhttp://LDSGamers.com/about/staff").catch(Module.handler.errorHandler);
	}
})
.addCommand({name: "videos",
	description: "The LDSG YouTube Channel",
	category: "LDSG",
	process: (msg) => {
		msg.channel.send("The LDSG YouTube Channel, featuring Let's Plays, Clips of the Week, and more:\nhttps://www.youtube.com/ldsgamers");
	}
});

module.exports = Module;
