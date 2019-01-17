const Discord = require("discord.js"),
  config = require("./config/config.json"),
  bot = new Discord.Client();

bot.on("ready", () => console.log("Ready!"));

bot.login(config.token);

module.exports = { bot, config };
