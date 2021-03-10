const Augur = require("augurbot"),
  google = require("../config/google_api.json"),
  u = require("../utils/utils"),
  GoogleSpreadsheet = require("google-spreadsheet");

const doc = new GoogleSpreadsheet(google.sheets.games),
  gb = "<:gb:493084576470663180>",
  ember = "<:ember:512508452619157504>",
  modLogs = "506575671242260490";

var steamGameList;
const discounts = new Map([
  ["114816596341424129", 5],  // Elite
  ["121783798647095297", 10], // Onyx
  ["121783903630524419", 15]  // Pro
]);
function code(n) {
  let chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let newCode = "";
  for (var i = 0; i < n; i++) {
    newCode += u.rand(chars);
  }
  return newCode;
}

function discountLevel(member) {
  let discount = { rate: 0, role: null };

  for (const [role, rate] of discounts) {
    if (member.roles.cache.has(role)) discount = { rate, role };
  }
  return discount;
}

function filterUnique(e, i, a) {
  return (a.indexOf(a.find(g => g.gametitle == e.gametitle && g.system == e.system)) == i);
}

const Module = new Augur.Module()
.addCommand({name: "balance",
  aliases: ["account", ember, "ember", gb, "gb", "ghostbucks"],
  description: "Show how many Ghost Bucks and Ember you've earned.",
  category: "Ghost Bucks",
  process: async (msg) => {
    try {
      let user = ( ((msg.mentions.users.size > 0) && (msg.guild && msg.member.roles.cache.has("96345401078087680"))) ? msg.mentions.users.first() : msg.author );
      let gbBalance = await Module.db.bank.getBalance(user, "gb");
      let emBalance = await Module.db.bank.getBalance(user, "em");
      let embed = u.embed()
      .setAuthor(
        (msg.guild ? msg.guild.members.cache.get(user.id).displayName : user.username),
        user.displayAvatarURL({dynamic: true})
      ).setDescription(`${gb}${gbBalance.balance}\n${ember}${emBalance.balance}`);
      msg.channel.send({embed});
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "gamelist",
  description: "See what games are available to redeem.",
  category: "Ghost Bucks",
  process: (msg, suffix) => {
    doc.useServiceAccountAuth(google.creds, (err) => {
      if (err) u.errorHandler(err, msg);
      else {
        doc.getRows(1, (err, games) => {
          for (const game of games.filter(g => !g.code)) {
            game.code = code(5);
            game.save();
          }

          games = games.filter(g => !g.recipient).filter(filterUnique).sort((a, b) => a.gametitle.localeCompare(b.gametitle));

          // Filter Rated M, unless the member has the Rated M Role
          if (!(msg.member && msg.member.roles.cache.has("281708645161631745")))
            games = games.filter(g => g.rating.toUpperCase() != "M");

          let embed = u.embed()
            .setTitle("Games Available to Redeem")
            .setDescription(`Redeem ${gb} for game codes with the \`!gameredeem code\` command.`);

          let i = 0;
          for (const game of games) {
            if (((++i) % 25) == 0) {
              msg.author.send({embed}).catch(u.noop);
              embed = u.embed()
              .setTitle("Games Available to Redeem")
              .setDescription(`Redeem ${gb} for game codes with the \`!gameredeem code\` command.`);
            }

            let steamApp = null;
            if (game.system.toLowerCase() == "steam") steamApp = steamGameList.find(g => g.name.toLowerCase() == game.gametitle.toLowerCase());

            embed.addField(`${game.gametitle} (${game.system})${(game.rating ? ` [${game.rating}]` : "")}`, `${gb}${game.cost}${(steamApp ? ` [[Steam Store Page]](https://store.steampowered.com/app/${steamApp.appid})` : "")}\n\`!gameredeem ${game.code}\``);
          }
          msg.author.send({embed}).catch(u.noop);
        });
      }
    });
  }
})
.addCommand({name: "gameredeem",
  syntax: "came code", hidden: true,
  description: "Redeem a game code",
  category: "Ghost Bucks",
  process: (msg, suffix) => {
    doc.useServiceAccountAuth(google.creds, (err) => {
      if (err) u.errorHandler(err, msg);
      else {
        doc.getRows(1, async (err, games) => {
          try {
            let game = games.filter(g => (g.code == suffix.toUpperCase() && g.date == ""));
            if (game.length > 0) {

              let systems = {
                steam: {
                  redeem: "https://store.steampowered.com/account/registerkey?key=",
                  img: "https://cdn.discordapp.com/emojis/230374637379256321.png"
                }
              };

              game = game[0];

              let balance = await Module.db.bank.getBalance(msg.author.id, "gb");
              if (balance.balance >= game.cost) {
                await Module.db.bank.addCurrency({
                  currency: "gb",
                  discordId: msg.author.id,
                  description: `${game.gametitle} (${game.system}) Game Key`,
                  value: -1 * game.cost,
                  mod: msg.author.id
                }, "gb");

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
                msg.author.send({embed}).catch(e => u.errorHandler(e, msg));
                msg.client.channels.cache.get(modLogs).send(`${msg.author.username} just redeemed ${gb}${game.cost} for a ${game.gametitle} (${game.system}) key.`);
              } else {
                msg.reply("You don't currently have enough ghost bucks. Sorry! " + gb);
              }
            } else {
              msg.reply("I couldn't find that game. Use `!gamelist` to see available games.").then(u.clean);
            }
          } catch(error) { u.errorHandler(error, msg); }
        });
      }
    })
  }
})
.addCommand({name: "giveember",
  syntax: "@user amount",
  description: "Give a user Ember",
  aliases: ["embergive", "giveem", "emgive"],
  permissions: (msg) => (msg.guild?.id == Module.config.ldsg),
  category: "Ghost Bucks",
  process: async (msg, suffix) => {
    const MAX = 10000;
    try {
      u.clean(msg, 0);
      let members = msg.mentions.members;
      if (members?.size > 0) {
        let team = msg.member.roles.cache.has(Module.config.roles.team);
        let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);
        let reason = suffix.replace(/<@!?\d+>/ig, "").trim().split(" ");
        let value = parseInt(reason.shift(), 10);
        for (const [discordId, member] of members) {
          if (discordId == msg.author.id) {
            msg.reply("you can't give to *yourself*, silly.").then(u.clean).catch(u.noop);
            continue;
          } else if ((discordId == msg.client.user.id) && !(reason.length > 0)) {
            msg.reply("you need to have a reason to give to me!").then(u.clean).catch(u.noop);
            continue;
          }

          if (value) {
            if (value > MAX) value = MAX;
            if (value < -MAX) value = -MAX;

            reason = ((reason.length > 0) ? reason.join(" ") : "No particular reason.").trim();

            let deposit = {
              currency: "em",
              discordId,
              description: `From ${msg.member.displayName}: ${reason}`,
              value,
              mod: msg.author.id
            };

            let account = await Module.db.bank.getBalance(msg.author.id, "em");
            if ((value < 0) && (!team || (discordId == msg.client.user.id))) {
              msg.reply(`You can't just *take* ${ember}, silly.`).then(u.clean);
            } else if (team || (value <= account.balance)) {
              if (discordId != msg.client.user.id) {
                let receipt = await Module.db.bank.addCurrency(deposit, "em");
                let balance = await Module.db.bank.getBalance(discordId, "em");
                member.send(`You were just awarded ${ember}${receipt.value} from ${u.escapeText(msg.member.displayName)} for ${reason}\nYou now have a total of ${ember}${balance.balance} in your LDSG account.`).catch(u.noop);
              }
              msg.channel.send(`${ember}${value} sent to ${member} for ${reason}`).then(u.clean);
              msg.client.channels.cache.get(modLogs).send(`${(discordId == msg.client.user.id) ? "<@111232201848295424> " : ""}**${u.escapeText(msg.member.displayName)}** gave **${u.escapeText(member.displayName)}** ${ember}${receipt.value} for ${reason}`);
              if (!team || (discordId == msg.client.user.id)) {
                let withdrawl = {
                  currency: "em",
                  discordId: msg.member.id,
                  description: `To ${member.displayName}: ${reason}`,
                  value: -value,
                  mod: msg.member.id
                }
                let receipt = await Module.db.bank.addCurrency(withdrawl, "em");
                msg.member.send(`You just sent ${u.escapeText(member.displayName)} ${ember}${value} for ${reason}`).catch(u.noop);
              }
            } else {
              msg.reply(`You don't have enough ${ember} to give! You can give up to ${ember}${account.balance}`).then(u.clean);
            }
          } else {
            msg.reply("You need to tell me how many Ember to give!").then(u.clean);
          }
        }
      } else msg.reply("You need to tell me who to give Ember!").then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "givegb",
  syntax: "@user amount",
  description: "Give a user Ghost Bucks",
  aliases: ["gbgive"],
  permissions: (msg) => (msg.guild?.id == Module.config.ldsg),
  category: "Ghost Bucks",
  process: async (msg, suffix) => {
    const MAX = 1000;
    try {
      u.clean(msg, 0);
      if (u.userMentions(msg, true).size > 0) {
        let admin = Module.config.adminId.includes(msg.member.id);
        let ldsg = msg.client.guilds.cache.get(Module.config.ldsg);
        let reason = suffix.replace(/<@!?\d+>/ig, "").trim().split(" ");
        let value = parseInt(reason.shift(), 10);
        for (const [discordId, member] of u.userMentions(msg, true)) {
          if (discordId == msg.author.id) {
            msg.reply("you can't give to *yourself*, silly.").then(u.clean).catch(u.noop);
            continue;
          }

          if (value) {
            if (value > MAX) value = MAX;
            if (value < -MAX) value = -MAX;

            reason = ((reason.length > 0) ? reason.join(" ") : "No particular reason.").trim();

            let deposit = {
              currency: "gb",
              discordId,
              description: `From ${msg.member.displayName}: ${reason}`,
              value,
              mod: msg.author.id
            };

            let account = await Module.db.bank.getBalance(msg.author.id, "gb");
            if (!admin && (value < 0)) {
              msg.reply(`You can't just *take* ${gb}, silly.`).then(u.clean);
            } else if (admin || (value <= account.balance)) {
              let receipt = await Module.db.bank.addCurrency(deposit, "gb");
              let balance = await Module.db.bank.getBalance(discordId, "gb");
              msg.channel.send(`${gb}${receipt.value} sent to ${member} for ${reason}`).then(u.clean);
              msg.client.channels.cache.get(modLogs).send(`**${u.escapeText(msg.member.displayName)}** gave **${u.escapeText(member.displayName)}** ${gb}${receipt.value} for ${reason}`);
              member.send(`You were just awarded ${gb}${receipt.value} from ${u.escapeText(msg.member.displayName)} for ${reason}\nYou now have a total of ${gb}${balance.balance} in your LDSG account.`).catch(u.noop);
              if (!admin) {
                let withdrawl = {
                  currency: "gb",
                  discordId: msg.member.id,
                  description: `To ${member.displayName}: ${reason}`,
                  value: -value,
                  mod: msg.member.id
                }
                let receipt = await Module.db.bank.addCurrency(withdrawl, "gb");
                msg.member.send(`You just sent ${u.escapeText(member.displayName)} ${gb}${value} for ${reason}`).catch(u.noop);
              }
            } else {
              msg.reply(`You don't have enough ${gb} to give! You can give up to ${gb}${account.balance}`).then(u.clean);
            }
          } else {
            msg.reply("You need to tell me how many Ghost Bucks to give!").then(u.clean);
          }
        }
      } else msg.reply("You need to tell me who to give Ghost Bucks!").then(u.clean);
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "houseember",
  syntax: "Date (DD MMMM YYYY)",
  description: "Check ember given to a house since a particular date.",
  permissions: msg => msg.member?.roles.cache.has(Module.config.roles.team),
  category: "Ghost Bucks",
  process: async (msg, suffix) => {
    let since = new Date(suffix);
    if (isNaN(since)) return msg.reply("you need to supply a valid date (try `DD MMMM YYYY` format).").then(u.clean);

    let awards = await Module.db.bank.getAwardsFrom(msg.guild.roles.cache.get(Module.config.roles.team).members.keyArray().concat(msg.client.user.id), since);

    let points = ["282364647041007616", "282364721045438464", "282364218282606594"].map(house => {
      let houseRole = msg.guild.roles.cache.get(house);
      let members = houseRole.members;

      let embers = awards
        .filter(a => members.has(a.discordId) && a.discordId != a.mod)
        .reduce((a, c) => a + c.value, 0);

      return {
        house,
        name: houseRole.name,
        embers,
        perCapita: embers / members.size
      }
    });
    let medals = ["🥇", "🥈", "🥉"];
    points.sort((a, b) => b.perCapita - a.perCapita);
    let embed = u.embed().setTitle(`House Points Since ${since.toDateString()}`)
      .setDescription("Current standings of the houses (Ember awards on a *per capita* basis):\n\n" + points.map((house, i) => `${medals[i]} **${house.name}:** ${house.perCapita.toFixed(2)}`).join("\n"));

    msg.channel.send({embed});
  }
})
.addCommand({name: "redeem",
  syntax: "amount",
  description: "Redeem Ghost Bucks for an LDSG store code ($1 off/100 GB)",
  category: "Ghost Bucks",
  process: async (msg, suffix) => {
    try {
      u.clean(msg);
      let amount = parseInt(suffix, 10);
      if (amount) {
        amount = Math.min(amount, 1000);
        let balance = await Module.db.bank.getBalance(msg.author, "gb");
        if ((amount <= balance.balance) && (amount > 0)) {
          let snipcart = require("../utils/snipcart")(Module.config.api.snipcart);
          let discountInfo = {
            name: msg.author.username + " " + Date().toLocaleString(),
            combinable: false,
            maxNumberOfUsages: 1,
            trigger: "Code",
            code: code(6),
            type: "FixedAmount",
            amount: (amount / 100)
          };

          let discount = await snipcart.newDiscount(discountInfo);

          if (discount.amount && discount.code) {
            let withdrawl = {
              currency: "gb",
              discordId: msg.author.id,
              description: "LDSG Store Discount Code",
              value: (0 - amount),
              mod: msg.author.id
            };
            let withdraw = await Module.db.bank.addCurrency(withdrawl, "gb");
            msg.author.send(`You have redeemed ${gb}${amount} for a $${discount.amount} discount code in the LDS Gamers Store! <http://ldsgamers.com/shop>\n\nUse code __**${discount.code}**__ at checkout to apply the discount. This code will be good for ${discount.maxNumberOfUsages} use. (Note that means that if you redeem a code and don't use its full value, the remaining value is lost.)\n\nYou now have ${gb}${balance.balance - amount}.`).catch(u.noop);
            msg.client.channels.cache.get(modLogs).send(`**${msg.author.username}** just redeemed ${gb}${amount} for a store coupon code. They now have ${gb}${balance.balance - amount}.`);
          } else {
            msg.reply("Sorry, something went wrong. Please try again.").then(u.clean);
          }
        } else {
          msg.reply(`you can currently redeem up to ${gb}${balance.balance}.`).then(u.clean);
        }
      } else {
        msg.reply("you need to tell me how many Ghost Bucks to redeem!").then(u.clean);
      }
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.setInit(async function(gl) {
  try {
    if (gl) steamGameList = gl;
    else {
      let SteamApi = require("steamapi"),
        steam = new SteamApi(Module.config.api.steam);
      steamGameList = await steam.getAppList();
    }
  } catch(e) { u.errorHandler(e, "Fetch Steam Game List Error"); }
})
.setUnload(() => steamGameList)
.addEvent("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    if ((newMember.guild.id == Module.config.ldsg) && (oldMember.roles.cache.size != newMember.roles.cache.size)) {
      let newLevel = discountLevel(newMember);
      if (discountLevel(oldMember).rate != newLevel.rate) {
        // Fetch user
        let user = await Module.db.user.fetchUser(newMember);
        let role = (newLevel.role ? newMember.roles.cache.get(newLevel.role).name : null);
        if (user) {
          // Check if current discount exists.
          let snipcart = require("../utils/snipcart")(Module.config.api.snipcart);
          let code = parseInt(user["_id"].toString().substr(16), 16).toString(36).toUpperCase();

          let discount = await snipcart.getDiscountCode(code);
          if (discount && (newLevel.rate > 0)) {
            // Discount has changed. Edit.
            discount.name = `${newMember.user.username} ${role}`;
            discount.rate = newLevel.rate;
            discount = await snipcart.editDiscount(discount);
            newMember.send(`Thanks for joining the ${role} ranks! As a thank you, you get a ${discount.rate}% discount on purchases in the shop by using code \`${discount.code}\`. This discount will apply as long as you keep the ${role} role.\nhttps://ldsgamers.com/shop`).catch(u.noop);
          } else if (discount && (newLevel.rate == 0)) {
            // Discount no longer applies. Delete.
            snipcart.deleteDiscount(discount);
          } else if (newLevel.rate > 0) {
            // New discount code
            discount = {
              name: `${newMember.user.username} ${role}`,
              trigger: "Code",
              code,
              type: "Rate",
              rate: newLevel.rate
            };

            await snipcart.newDiscount(discount);
            newMember.send(`Thanks for joining the ${role} ranks! As a thank you, you get a ${discount.rate}% discount on purchases in the shop by using code \`${discount.code}\`. This discount will apply as long as you keep the ${role} role.\nhttps://ldsgamers.com/shop`).catch(u.noop);
          }
        }
      }
    }
  } catch(e) { u.errorHandler(e, "Sponsor discount error"); }
});

module.exports = Module;
