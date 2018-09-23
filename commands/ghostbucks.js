const Augur = require("augurbot"),
  google = require("../config/google_api.json"),
  request = require("request"),
  u = require("../utils/utils"),
  GoogleSpreadsheet = require("google-spreadsheet");

const doc = new GoogleSpreadsheet(google.sheets.games),
  gb = "<:gb:493084576470663180>",
  modLogs = "154676105247195146";

function code(n) {
	let chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
	let newCode = "";
	for (var i = 0; i < n; i++) {
		newCode += u.rand(chars);
	}
	return newCode;
}

function filterUnique(e, i, a) {
  return (a.indexOf(a.find(g => g.gametitle == e.gametitle && g.system == e.system)) == i);
}

const Module = new Augur.Module()
.addCommand({name: "gamelist",
	hidden: true,
	description: "See what games are available to redeem.",
	process: (msg, suffix) => {
		doc.useServiceAccountAuth(google.creds, (err) => {
		  if (err) console.error(err);
		  else {
		    doc.getRows(1, (err, games) => {

					games.filter(g => !g.code).forEach(game => {
						game.code = code(5);
						game.save();
					});

					games = games.filter(g => !g.recipient).filter(filterUnique);

					let embed = u.embed()
					  .setTitle("Games Available to Redeem")
						.setDescription(`Redeem ${gb} for game codes with the \`!gameredeem code\` command.`);
					games.forEach((game, i) => {
						if (((i + 1) % 25) == 0) {
							msg.author.send(embed);
							embed = u.embed()
							  .setTitle("Games Available to Redeem")
								.setDescription(`Redeem ${gb} for game codes with the \`!gameredeem code\` command.`);
						}
						embed.addField(`${game.gametitle} (${game.system})`, `${gb}${game.cost}\n\`!gameredeem ${game.code}\``, true);
					});
					msg.author.send(embed);
		    });
		  }
		});
	}
})
.addCommand({name: "gameredeem",
	syntax: "came code", hidden: true,
	description: "Redeem a game code",
	process: (msg, suffix) => {
		doc.useServiceAccountAuth(google.creds, (err) => {
			if (err) console.error(err);
			else {
				doc.getRows(1, (err, games) => {
					let game = games.filter(g => (g.code == suffix.toUpperCase() && g.date == ""));
					if (game.length > 0) {

						let systems = {
							steam: {
								redeem: "https://store.steampowered.com/account/registerkey?key=",
								img: "https://cdn.discordapp.com/emojis/230374637379256321.png"
							}
						};

						game = game[0];

						Module.db.bank.getBalance(msg.author.id).then(balance => {
							if (balance.balance >= game.cost) {

								Module.db.bank.addGhostBucks({
									discordId: msg.author.id,
									description: `${game.gametitle} (${game.system}) Game Key`,
									value: -1 * game.cost,
									mod: msg.author.id
								}).then(() => {

									let embed = u.embed()
									.setTitle("Game Code Redemption")
									.setDescription(`You just redeemed a key for:\n${game.gametitle} (${game.system})`)
									.addField("Cost", gb + game.cost, true)
									.addField("Balance", gb + (balance.balance - game.cost), true)
									.addField("Game Key", game.key);

									if (systems[game.system.toLowerCase()]) {
										let sys = systems[game.system.toLowerCase()];
										embed.setURL(sys.redeem + game.key)
										.addField("Key Redemption Link", `[Redeem key here](${sys.redeem + game.key})`)
										.setThumbnail(sys.img);
									}

									game.recipient = msg.author.username;
									game.date = new Date();
									game.save();
									msg.author.send(embed);
									msg.client.channels.get(modLogs).send(`${msg.author.username} just redeemed ${gb}${game.cost} for a ${game.gametitle} (${game.system}) key.`);
								});

							} else {
								msg.reply("You don't currently have enough ghost bucks. Sorry! " + gb);
							}

						});
					} else {
						msg.reply("I couldn't find that game. Use `!gamelist` to see available games.").then(u.clean);
					}
				});
			}
		})
	}
})
.addCommand({name: "gb",
	syntax: "",
	aliases: ["account", "gb", "sprouts", "brussels", "brusselssprouts", gb],
	description: "Show how many Ghost Bucks you've earned.",
	category: "mod",
	process: (msg) => {
		let user = ( ((msg.mentions.users.size > 0) && (msg.guild && msg.member.roles.has("96345401078087680"))) ? msg.mentions.users.first() : msg.author );
		Module.db.bank.getBalance(user).then(userBalance => {
			msg.channel.send(`${user} currently has ${gb}${userBalance.balance}`);
		}).catch(console.error);
	}
})
.addCommand({name: "give",
	syntax: "@user amount",
	description: "Give a user Ghost Bucks",
	permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg)),
	process: (msg, suffix) => {
		msg.delete();
		if (msg.mentions.users && msg.mentions.users.size > 0) {
			msg.mentions.users.forEach(user => {
				let admin = Module.config.adminId.includes(msg.member.id);
				let ldsg = msg.client.guilds.get(Module.config.ldsg);
				let reason = suffix.replace(/<@!?\d+>/ig, "").trim().split(" ");
				let bucks = parseInt(reason.shift(), 10);
				reason = ((reason.length > 0) ? reason.join(" ") : "No particular reason.");

				let deposit = {
					discordId: user.id,
					description: `From ${msg.member.displayName}: ${reason}`,
					value: bucks,
					mod: msg.author.id
				};

				if (bucks) {
					Module.db.bank.getBalance(msg.author.id).then(account => {
						if (!admin && (bucks < 0)) {
							msg.reply(`You can't just *take* ${gb}, silly.`).then(u.clean);
						} else if (admin || (bucks <= account.balance)) {
							Module.db.bank.addGhostBucks(deposit).then(receipt => {
								let member = ldsg.members.get(user.id);
								Module.db.bank.getBalance(user.id).then(balance => {
									msg.channel.send(`${gb}${receipt.value} sent to ${member} for ${reason}`).then(u.clean);
									msg.client.channels.get(modLogs).send(`**${msg.member.displayName}** gave **${member.displayName}** ${gb}${receipt.value} for ${reason}.`);
									member.send(`You were just awarded ${gb}${receipt.value} from ${msg.member.displayName} for ${reason}! 💸\nYou now have a total of ${gb}${balance.balance} in your LDSG account.`);
								});
								if (!admin) {
									let withdrawl = {
										discordId: msg.member.id,
										description: `To ${member.displayName}: ${reason}`,
										value: -bucks,
										mod: msg.member.id
									}
									Module.db.bank.addGhostBucks(withdrawl).then(receipt => {
										msg.member.send(`You just sent ${member.displayName} ${gb}${bucks} for ${reason}`);
									});
								}
							});

						} else {
							msg.reply(`You don't have enough ${gb} to give! You can give up to ${gb}${account.balance}`).then(u.clean);
						}
					});
				} else {
					msg.reply("You need to tell me how many Ghost Bucks to give!").then(u.clean);
				}
			});
		} else msg.reply("You need to tell me who to give Ghost Bucks!").then(u.clean);
	}
})
.addCommand({name: "redeem",
	syntax: "amount",
	description: "Redeem Ghost Bucks for an LDSG store code",
	process: (msg, suffix) => {
		msg.delete();
		let amount = parseInt(suffix, 10);
		if (amount) {
			Module.db.bank.getBalance(msg.author).then(balance => {
				if ((amount <= balance.balance) && (amount > 0)) {
					let options = require("../config/snipcart.json");

					options.form.name = msg.author.username + " " + Date().toLocaleString();
					options.form.code = code(6);
					options.form.amount = (amount / 100);

					request.post(options, (error, response, body) => {
						if (!error && body) {
							body = JSON.parse(body);
							if (body.amount && body.code) {
								let withdrawl = {
									discordId: msg.author.id,
									description: "LDSG Store Discount Code",
									value: (0 - amount),
									mod: msg.author.id
								};
								Module.db.bank.addGhostBucks(withdrawl).then(withdraw => {
									msg.author.send(`You have redeemed ${gb}${amount} for a $${body.amount} discount code in the LDS Gamers Store! <http://ldsgamers.com/shop>\n\nUse code __**${body.code}**__ at checkout to apply the discount. This code will be good for ${body.maxNumberOfUsages} use. (Note that means that if you redeem a code and don't use its full value, the remaining value is lost.)\n\nYou now have ${gb}${balance.balance - amount}.`);
									msg.client.channels.get(modLogs).send(`**${msg.author.username}** just redeemed ${gb}${amount} for a store coupon code. They now have ${gb}${balance.balance - amount}.`);
								});
							} else {
								msg.reply("Sorry, something went wrong. Please try again.").then(u.clean);
							}
						}
					});

				} else {
					msg.reply(`you can currently redeem up to ${gb}${balance.balance}.`).then(u.clean);
				}
			}).catch(console.error);
		} else {
			msg.reply("you need to tell me how many Ghost Bucks to redeem!").then(u.clean);
		}
	}
});

module.exports = Module;
