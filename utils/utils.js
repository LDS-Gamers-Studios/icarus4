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

    if (typeof msg == "string") {
      errorInfo.addField("Message", msg);
    } else if (msg) {
      let bot = msg.client;
      if (bot.shard) errorInfo.addField("Shard", bot.shard.id, true);

      msg.channel.send("I've run into an error. I've let my owner know.")
        .then(m => m.delete(10000));

      errorInfo
      .addField("User", msg.author.username, true)
      .addField("Location", (msg.guild ? `${msg.guild.name} > ${msg.channel.name}` : "PM"), true)
      .addField("Command", msg.cleanContent || "`undefined`", true)
    }

    let errorStack = (error.stack ? error.stack : error.toString());
    if (errorStack.length > 1024) errorStack = errorStack.slice(0, 1000);

    errorInfo.addField("Error", errorStack);

    errorLog.send(errorInfo);

    console.error(Date());
    if (typeof msg == "string") console.error(msg);
    else if (msg) console.error(`${msg.author.username} in ${(msg.guild ? (msg.guild.name + " > " + msg.channel.name) : "DM")}: ${msg.cleanContent}`);
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
    setTimeout((m) => {
      if (msg.deletable && !msg.deleted) m.delete();
    }, t, msg);
    return Promise.resolve(msg);
  },
  embed: (data) => new Discord.RichEmbed(data).setColor(config.color),
  errorLog: errorLog,
  escapeText: (txt) => txt.replace(/(\*|_|`|~|\\|\|)/g, '\\$1'),
  getUser: function(msg, user, strict = false) {
    // Finds a user in the same guild as the message.

    // If no user to look for, return message author.
    if (user.length == 0 || !msg.guild) return (msg.guild ? msg.member : msg.author);

    let lcUser = user.toLowerCase();
    let memberCollection = msg.guild.members;

    let myFn = (element) => false;
    // If there's a discriminator given, look for exact match
    if (lcUser.length > 5 && lcUser.charAt(lcUser.length-5) === "#")
      myFn = (element) => element.user.tag.toLowerCase() === lcUser;
    // Otherwise look for exact match of either nickname or username
    else if (!strict)
      myFn = (element) => (element.displayName.toLowerCase() === lcUser || element.user.username.toLowerCase() === lcUser);

    let foundUser = memberCollection.find(myFn);

    // If no exact match, find a user whose nick or username begins with the query
    /*
    if (!foundUser && !strict) {
      myFn = (element) => (element.displayName.toLowerCase().startsWith(lcUser) || element.user.username.toLowerCase().startsWith(lcUser));
      foundUser = memberCollection.find(myFn);
    }
    */
    // If still no match, search by ID
    if (!foundUser)
      foundUser = memberCollection.get(user);

    // If still no match, return message author
    if (!foundUser && !strict)
      foundUser = msg.member;

    return foundUser;
  },
  init: (Handler) => db.init(Handler),
  ignoreError: (e) => {},
  noop: () => {},
  paginator: async function(msg, pager, elements, page = 0, perPage = 1) {
    try {
      let totalPages = Math.ceil(elements.length / perPage);
      if (totalPages > 1) {
        let embed = pager(elements, page, msg)
        .setFooter(`Page ${page + 1} / ${totalPages}. React with ⏪ and ⏩ to navigate.`);
        let m = await msg.channel.send({embed});
        await m.react("⏪");
        await m.react("⏩");
        let reactions;

        do {
          reactions = await m.awaitReactions(
            (reaction, user) => (user.id == msg.author.id) && ["⏪", "⏩"].includes(reaction.emoji.name),
            { time: 300000, max: 1 }
          );
          if (reactions.size > 0) {
            let react = reactions.first().emoji.name;
            if (react == "⏪") page--;
            else if (react == "⏩") page++;
            if (page < 0 || page >= totalPages) page = (page + totalPages) % totalPages;

            reactions.first().remove(msg.author.id);

            embed = pager(elements, page, msg)
            .setFooter(`Page ${page + 1} / ${totalPages}. React with ⏪ and ⏩ to navigate.`);
            m = await m.edit({embed});
          }
        } while (reactions.size > 0);

        embed.setFooter(`Page ${page + 1} / ${totalPages}`);
        m.edit({embed});
        m.reactions.filter(r => r.me).forEach(r => r.remove());
      } else await msg.channel.send({embed: pager(elements, page, msg)});
    } catch(e) { Utils.alertError(e, msg); }
  },
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
