const Discord = require("discord.js"),
  config = require("./config/config.json"),
  bot = new Discord.Client();

bot.on("ready", () => ldsg = bot.guilds.get(config.ldsg));

bot.login(config.token);

module.exports = { bot, config };
