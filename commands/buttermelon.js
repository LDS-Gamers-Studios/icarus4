const Augur = require("augurbot"),
  buttermelon = require("../data/buttermelon.json");

function buttermelonEdit(msg) {
	let emojis = {
		buttermelon: "305039588014161921",
		why: "403553351775551488"
	};
	let exclude = ['121033996439257092', '164784857296273408'];
	if (!msg.author.bot && !exclude.includes(msg.channel.id)) {
		//let banana = /[bß8ƥɓϐβбБВЬЪвᴮᴯḃḅḇÞ][a@∆æàáâãäåāăȁȃȧɑαдӑӓᴀᴬᵃᵅᶏᶐḁạảấầẩẫậắằẳẵặ4Λ]+([nⁿńňŋƞǹñϰпНhийӣӥѝνṅṇṉṋ]+[a@∆æàáâãäåāăȁȃȧɑαдӑӓᴀᴬᵃᵅᶏᶐḁạảấầẩẫậắằẳẵặ4Λ]+){2}/ig;
		let roll = Math.random();
		if (/bananas/.test(msg.content.toLowerCase())) {
			if (roll < .1)
				msg.channel.send({files: ["https://cdn.discordapp.com/attachments/154625360514777088/239045323522179073/buttermelons.jpg"]}).catch(console.error);
			else if (roll < .3)
				msg.channel.send("*buttermelons").catch(console.error);
		} else if (/banana/.test(msg.content.toLowerCase().replace(/(\*|_)/ig, ""))) {
			if (roll < .06)
				msg.channel.send({files: ["https://cdn.discordapp.com/attachments/136577505418018826/238764601951387648/buttermelon.jpg"]}).catch(console.error);
			else if (roll < .1)
				msg.channel.send({files: ["https://cdn.discordapp.com/attachments/96335850576556032/374995339997872128/YigaButtermelon_web.png"]}).catch(console.error);
			else if (roll < .3)
				msg.channel.send("*buttermelon").catch(console.error);
		}

		// Reactions
    let bot = msg.client;
		if ((msg.mentions.users && msg.mentions.users.has(bot.user.id)) || (msg.mentions.roles && msg.mentions.roles.has("96360253850935296")))
			msg.react(bot.emojis.get(emojis.why)).catch(console.error);
		else if (/buttermelon/.test(msg.content.toLowerCase()) && (roll < .3))
			msg.react(bot.emojis.get(emojis.buttermelon)).catch(console.error);
		else if (/carp/.test(msg.content.toLowerCase()) && (roll < .3))
			msg.react("🐟").catch(console.error);
	}
}

const Module = new Augur.Module()
.addCommand({name: "buttermelon",
	description: "Buttermelon facts",
	aliases: ["buttermelonfacts"],
	process: (msg) => {
		let fact = Math.floor(Math.random() * buttermelon.facts.length);
		msg.channel.send("🍌 " + buttermelon.facts[fact]).catch(console.error);
	}
})
.addCommand({name: "buttermelonhistory",
	description: "History of the Buttermelon",
	process: (msg) => {
		msg.channel.send("http://ytcropper.com/cropped/lY59de2f95eaaba");
	}
})
.addEvent("message", buttermelonEdit)
.addEvent("messageUpdate", (oldMsg, msg) => {
  if (!(/banana/.test(oldMsg.cleanContent.toLowerCase())))
    buttermelonEdit(msg);
});

module.exports = Module;
