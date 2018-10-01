const	Augur = require("augurbot"),
  hasLink = /http(s)?:\/\/(\w+(-\w+)*\.)+\w+/,
	affiliateLinks = {
		amazon: {
			site: "Amazon",
			affiliate: "Amazon Affiliate",
			test: /amazon\.(com|co\.uk)\/(\w+(\-\w+)*\/)?(gp\/product|dp)\/(\w+)/i,
			tag: /tag=ldsgamers\-20/,
			link: (match) =>`https://www.${match[0]}?tag=ldsgamers-20`
		},
		cdkeys: {
			site: "CDKeys.com",
			affiliate: "CDKeys Affiliate",
			test: /cdkeys\.com(\/\w+(\-\w+)*)*/i,
			tag: /mw_aref=LDSGamers/i,
			link: match => `https://www.${match[0]}?mw_aref=LDSGamers`
		},
		humblebundle: {
			site: "Humble Bundle",
			affiliate: "Humble Bundle Partner",
			test: /humblebundle\.com(\/\w+(\-\w+)*)*/i,
			tag: /partner=ldsgamers/i,
			link: (match) => `https://www.${match[0]}?partner=ldsgamers`
		}
	};

function processLinks(msg) {
	for (x in affiliateLinks) {
		let site = affiliateLinks[x];
		let match = site.test.exec(msg.cleanContent);
		if (match && !site.tag.test(msg.cleanContent))
      msg.channel.send(`You can help LDSG by using our ${site.affiliate} link: <${site.link(match)}>`);
	}
}

const Module = new Augur.Module()
.addCommand({name: "humble",
  description: "Get the LDSG Partner link to the current Humble Bundle.",
  aliases: ["hb"],
  category: "LDSG",
  process: (msg) => msg.channel.send("LDSG's Partner link to the current Humble Bundle:\nhttps://www.humblebundle.com/games?partner=ldsgamers")
})
.addEvent("message", (msg) => {
  if (hasLink.test(msg.cleanContent))
    processLinks(msg);
})
.addEvent("messageUpdate", (oldMsg, msg) => {
  if (hasLink.test(msg.cleanContent) && !hasLink.test(oldMsg.cleanContent))
    processLinks(msg);
});

module.exports = Module;
