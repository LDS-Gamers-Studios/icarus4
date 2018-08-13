const Augur = require("augurbot"),
	request = require('request'),
	u = require("../utils/utils");

const platforms = {
	xb: {
		'url': ' xbox&user=Xbox&channel=ldsgamers',
		'system': 'Xbox'
	},
	ps: {
		'url': ' ps&user=PS&channel=ldsgamers',
		'system': 'Playstation'
	},
	battlenet: {
		'url': ' pc&user=PC&channel=ldsgamers',
		'system': 'PC'
	},
	epic: {
		'url': ' pc&user=PC&channel=ldsgamers',
		'system': 'PC'
	}
};

const Module = new Augur.Module()
.addCommand({name: "destiny",
	description: "Destiny Stat Tracker",
	syntax: "<action> [[@user | user+name] [console]]",
  aliases: ["d"],
  hidden: true,
	process: (msg, suffix) => {
		u.clean(msg);
		if (suffix) {
			var params = suffix.split(" ");
			var user = null;
			if ((params.length == 1) && (msg.mentions.users.size == 0)) {
				user = msg.author;
			} else if ((params.length == 1) && (msg.mentions.users.size == 1)) {
				msg.reply("you need to tell me what stats you want to see.").then(u.clean);
				return;
			} else if (msg.mentions.users.size != 0) {
				user = msg.mentions.users.first();
			}
			var action = params[0];

			if (user != null) {
				Module.db.ign.find(user.id, ['xb', 'ps']).then(igns => {
					if (igns.length > 0) {
						let requests = [];
						igns.forEach(ign => {
							let requestUrl = "https://2g.be/twitch/destinyv2.php?query=" + action + " " + ign.ign + platforms[ign.system].url;
							requests.push(new Promise(function(fulfill, reject) {
								request(requestUrl, function(error, response, body) {
									if (!error && response.statusCode == 200) {
										fulfill(body);
										//msg.channel.send(body);
									} else reject(error);
								});
							}));
						});
						Promise.all(requests).then(responses => {
							let equal = true;
							for (var i = 0; i < responses.length; i++) {
								if (responses[i].substr(responses[i].indexOf(":")) !== responses[0].substr(responses[0].indexOf(":")))
									equal = false;
							}
							if (equal) {
								u.botSpam(msg).send(responses[0].substr(responses[0].indexOf(":")+2));
							} else {
								u.botSpam(msg).send(responses.join("\n"));
							}
						}).catch(console.error);
					} else {
						msg.channel.send((msg.guild ? msg.guild.members.get(user.id).displayName : user.username) + " has not set a Gamertag or PSN Name with `!addign`. You can still search with `!destiny <action> <ign> <console>`")
							.then(u.clean);
					}
				});
			} else {
				let requestUrl = `https://2g.be/twitch/destinyv2.php?query=${suffix}&defaultconsole=xbox&user=${msg.author.username}`;
				request(requestUrl, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						u.botSpam(msg).send(body);
					} else console.log(error);
				});
			}
		} else {
			msg.reply("you need to tell me what stats you want to see.").then(u.clean);
		}
	}
})
.addCommand({name: "destiny2",
	description: "Destiny 2 Stat Tracker",
	syntax: "<action> [[@user | user+name] [console]]",
	aliases: ["d2"],
  hidden: true,
	process: (msg, suffix) => {
		u.clean(msg);
		if (suffix) {

			var params = suffix.split(" ");
			var user = null;
			if ((params.length == 1) && (msg.mentions.users.size == 0)) {
				user = msg.author;
			} else if ((params.length == 1) && (msg.mentions.users.size == 1)) {
				msg.reply("you need to tell me what stats you want to see.").then(u.clean);
				return;
			} else if (msg.mentions.users.size != 0) {
				user = msg.mentions.users.first();
			}
			var action = params[0];

			if (user != null) {
				Module.db.ign.find(user.id, ['xb', 'ps', 'battlenet']).then(igns => {
					if (igns.length > 0) {
						let requests = [];
						igns.forEach(ign => {
							let requestUrl = "http://destinycommand.com/api/command?token=15066976961743233374&query=" + action + " " + (ign.system == "battlenet" ? ign.ign.replace("#", "-") : ign.ign) + platforms[ign.system].url;
							requests.push(new Promise(function(fulfill, reject) {
								request(requestUrl, function(error, response, body) {
									if (!error && response.statusCode == 200) {
										fulfill(body);
										//msg.channel.send(body);
									} else reject(error);
								});
							}));
						});
						Promise.all(requests).then(responses => {
							let equal = true;
							for (var i = 0; i < responses.length; i++) {
								responses[i] = responses[i].replace(": .", ": Data not found.");
								if (responses[i].substr(responses[i].indexOf(":")) !== responses[0].substr(responses[0].indexOf(":")))
									equal = false;
							}
							if (equal) {
								u.botSpam(msg).send(responses[0].substr(responses[0].indexOf(":")+2));
							} else {
								u.botSpam(msg).send(responses.join("\n"));
							}
						}).catch(console.error);
					} else {
						msg.channel.send((msg.guild ? msg.guild.members.get(user.id).displayName : user.username) + " has not set a Gamertag, Battle.net name, or PSN Name with `!addign`. You can still search with `!destiny2 <action> <ign> <console>`")
							.then(u.clean);
					}
				});
			} else {
				let requestUrl = `http://destinycommand.com/api/command?token=15066976961743233374&query=${suffix}&defaultconsole=xbox&user=${msg.author.username}`;
				request(requestUrl, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						u.botSpam(msg).send(body);
					} else console.log(error);
				});
			}
		} else {
			msg.reply("you need to tell me what stats you want to see.").then(u.clean);
		}
	}
})
.addCommand({name: "fortnite",
	description: "Fortnite Stat Tracker",
	syntax: "<action> [[@user | user+name] [console]]",
	process: (msg, suffix) => {
		u.clean(msg);
		if (suffix) {
      var params = suffix.split(" ");
			var user = null;
			if ((params.length == 1) && (msg.mentions.users.size == 0)) {
				user = msg.author;
			} else if ((params.length == 1) && (msg.mentions.users.size == 1)) {
				msg.reply("you need to tell me what stats you want to see.").then(u.clean);
				return;
			} else if (msg.mentions.users.size != 0) {
				user = msg.mentions.users.first();
			}
			var action = params[0];

			if (user != null) {
				Module.db.ign.find(user.id, ['xb', 'ps', 'epic']).then(igns => {
					if (igns.length > 0) {
						let requests = [];
						igns.forEach(ign => {
							let requestUrl = "https://2g.be/twitch/Fortnite/command/query=" + action + " " + ign.ign + platforms[ign.system].url;
							requests.push(new Promise(function(fulfill, reject) {
								request(requestUrl, function(error, response, body) {
									if (!error && response.statusCode == 200) {
										fulfill(body);
										//msg.channel.send(body);
									} else reject(error);
								});
							}));
						});
						Promise.all(requests).then(responses => {
							let equal = true;
							let response = [];
							for (var i = 0; i < responses.length; i++) {
								if (!responses[i].includes("No stats found for user")) response.push(responses[i]);
								if (responses[i].substr(responses[i].indexOf(":")) !== responses[0].substr(responses[0].indexOf(":")))
									equal = false;
							}
							if (equal && (response.length > 0)) {
								u.botSpam(msg).send(responses[0].substr(responses[0].indexOf(":")+2));
							} else if (response.length > 0) {
								u.botSpam(msg).send(response.join("\n"));
							} else {
								u.botSpam(msg).send("No stats found for saved user names on " + igns.map(ign => ign.system).join(", "));
							}
						}).catch(console.error);
					} else {
						msg.channel.send((msg.guild ? msg.guild.members.get(user.id).displayName : user.username) + " has not set a Gamertag, Epic Games Battletag, or PSN Name with `!addign`. You can still search with `!fortnite <action> <ign> <console>`")
							.then(u.clean);
					}
				});
			} else {
				let requestUrl = `https://2g.be/twitch/Fortnite/command/query=${suffix}&defaultconsole=xbox&user=${msg.author.username}&channel=ldsgamers`;
				request(requestUrl, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						u.botSpam(msg).send(body);
					} else console.log(error);
				});
      }
		} else {
			msg.reply("you need to tell me what stats you want to see.").then(u.clean);
		}
	}
})
.addCommand({name: "overwatch",
	description: "Overwatch Stat Tracker",
	syntax: "<action> [[@user | user+name] [console]]",
	process: (msg, suffix) => {
		u.clean(msg);

		if (suffix) {
			let baseUrl = "https://2g.be/twitch/Overwatch/command/query=";

			var params = suffix.split(" ");
			var user = null;
			if ((params.length == 1) && (msg.mentions.users.size == 0)) {
				user = msg.author;
			} else if ((params.length == 1) && (msg.mentions.length == 1)) {
				msg.reply("you need to tell me what stats you want to see.").then(u.clean);
				return;
			} else if (msg.mentions.users.size != 0) {
				user = msg.mentions.users.first();
			}
			var action = params[0];

			if (user != null) {
				Module.db.ign.find(user.id, ['xb', 'ps', 'battlenet']).then(igns => {
					if (igns.length > 0) {
						let requests = [];
						igns.forEach(ign => {
							if (ign.system == "battlenet") ign.ign = ign.ign.replace("#", "-");
							let requestUrl = baseUrl + action + " " + ign.ign + platforms[ign.system].url + "&channel=ldsgamers";
							requests.push(new Promise(function(fulfill, reject) {
								request(requestUrl, function(error, response, body) {
									if (!error && response.statusCode == 200) {
										fulfill(body);
										//msg.channel.send(body);
									} else reject(error);
								});
							}));
						});
						Promise.all(requests).then(responses => {
							let equal = true;
							for (var i = 0; i < responses.length; i++) {
								if (responses[i].substr(responses[i].indexOf(":")) !== responses[0].substr(responses[0].indexOf(":")))
									equal = false;
							}
							if (equal) {
								u.botSpam(msg).send(responses[0].substr(responses[0].indexOf(":")+2));
							} else {
								u.botSpam(msg).send(responses.join("\n"));
							}
						}).catch(console.error);
					} else {
						msg.channel.send((msg.guild ? msg.guild.members.get(user.id).displayName : user.username) + " has not set a Gamertag, PSN Name, or Battlenet Name with `!addign`. You can still search with `!overwatch <action> <ign> <console>`")
							.then(u.clean);
					}
				});
			} else {
				let requestUrl = `${baseUrl}${suffix}&channel=ldsgamers&defaultconsole=pc&user=${(msg.guild ? msg.member.displayname : msg.author.username)}`;
				request(requestUrl, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						u.botSpam(msg).send(body);
					} else console.log(error);
				});
			}
		} else {
			msg.reply("you need to tell me what stats you want to see.").then(u.clean);
		}
	}
});

module.exports = Module;
