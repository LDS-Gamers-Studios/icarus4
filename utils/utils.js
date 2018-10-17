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
  getUser: function(msg, user) {
	// Finds a user in the same guild as the message.

	// If no user to look for, return message author.
	if (user.length == 0) return msg.author;

	let lcUser = user.toLowerCase();
	let memberCollection = msg.guild.members;

	let myFn = (element) => false;
    // If there's a discriminator given, look for exact match
	if (lcUser.length > 5 && lcUser.charAt(lcUser.length-5) === "#")
      myFn = (element) => element.user.tag.toLowerCase() === lcUser;
    // Otherwise look for exact match of either nickname or username
    else
	  myFn = (element) => (element.displayName.toLowerCase() === lcUser || element.user.username.toLowerCase() === lcUser);

	let foundUser = memberCollection.find(myFn);

    // If no exact match, find a user whose nick or username begins with the query
	if (foundUser === undefined) {
	  myFn = (element) => (element.displayName.toLowerCase().startsWith(lcUser) || element.user.username.toLowerCase().startsWith(lcUser));
	  foundUser = memberCollection.find(myFn);
    }

	// If still no match, search by ID
    if (foundUser === undefined)
	  foundUser = memberCollection.get(user);

	// If still no match, return message author
	if (foundUser === undefined)
	  foundUser = msg.author;

	return foundUser;
  }
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
