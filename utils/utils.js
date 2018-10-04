const Discord = require("discord.js"),
  config = require("../config/config.json"),
  fs = require("fs"),
  path = require("path"),
  db = require(path.resolve(process.cwd(), config.db.model));

const errorLog = new Discord.WebhookClient(config.error.id, config.error.token),
  serverSettings = new Map();

const Utils = {
  alertError: function(error, msg = null) {
    if (!error) return;

    let errorInfo = new Discord.RichEmbed()
    .setTimestamp()
    .setTitle(error.name);

    if (msg) {
      let bot = msg.client;
      if (bot.shard) errorInfo.addField("Shard", bot.shard.id, true);

      msg.channel.send("I've run into an error. I've let my owner know.")
        .then(m => m.delete(10000));

      errorInfo
      .addField("User", msg.author.username, true)
      .addField("Location", (msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "PM"), true)
      .addField("Command", msg.cleanContent, true)
    }

    let errorStack = (error.stack ? error.stack : error.toString());
    if (errorStack.length > 1024) errorStack = errorStack.slice(0, 1000);

    errorInfo.addField("Error", errorStack);

    errorLog.send(errorInfo);

    console.error(Date());
    if (msg) console.error(`${msg.author.username} in ${(msg.guild ? (msg.guild.name + " > " + msg.channel.name) : "DM")}: ${msg.cleanContent}`);
    console.trace(error);
  },
  botSpam: function(msg) {
    if (msg.guild && msg.channel.id != "209046676781006849") {
      let botspam = db.server.getSetting(msg.guild, "botspam");
      if (botspam && (botspam != msg.channel.id)) {
        msg.reply(`I've placed your results in <#${botspam}> to keep things nice and tidy in here. Hurry before they get cold!`)
        .then(Utils.clean);
        return msg.guild.channels.get(botspam);
      } else return msg.channel;
    } else return msg.channel;
  },
  clean: function(msg, t = 20000) {
    if (msg.deletable && !msg.deleted) msg.delete(t);
  },
  embed: () => new Discord.RichEmbed().setColor(config.color),
  errorLog: errorLog,
  escapeText: (msg) => msg.replace(/\*/g,"\\*").replace(/_/g,"\\_").replace(/~/g,"\\~"),
  init: (Handler) => db.init(Handler),
  parse: function(msg) {
    let prefix = Utils.prefix(msg);
    let message = msg.content;
    if (message.startsWith(prefix) && !msg.author.bot) {
      let parse = message.slice(prefix.length).trim().split(" ");
      let command = parse.shift().toLowerCase();
      return {command: command, suffix: parse.join(" ")};
    }
  },
  prefix: function(msg) {
    if (msg.guild) return db.server.getSetting(msg.guild, "prefix");
    else return config.prefix;
  },
  properCase: (txt) => txt.split(" ").map(word => (word[0].toUpperCase() + word.substr(1).toLowerCase())).join(" "),
  rand: (array) => array[Math.floor(Math.random() * array.length)],
  userMentions: function(msg) {
    // Useful to ensure the bot isn't included in the mention list,
    // such as when the bot mention is the command prefix
    let bot = msg.client;
    let userMentions = msg.mentions.users;
    if (userMentions.has(bot.user.id)) userMentions.delete(bot.user.id);
    return (userMentions.size > 0 ? userMentions : null);
  }
};

module.exports = Utils;
