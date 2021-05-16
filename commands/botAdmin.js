const Augur = require("augurbot"),
  fs = require("fs"),
  path = require("path"),
  Trello = require("simply-trello"),
  u = require("../utils/utils"),
  google = require("../config/google_api.json"),
  {GoogleSpreadsheet} = require("google-spreadsheet");

const doc = new GoogleSpreadsheet(google.sheets.config);

const Module = new Augur.Module()
.addCommand({name: "gotobed",
  category: "Bot Admin",
  hidden: true,
  aliases: ["q", "restart"],
  process: async function(msg) {
    try {
      await msg.react("🛏");

      let files = fs.readdirSync(path.resolve(process.cwd(), "./commands")).filter(f => f.endsWith(".js"));

      for (let file of files) {
        Module.client.moduleHandler.unload(path.resolve(process.cwd(), "./commands/", file));
      }

      if (msg.client.shard) {
        msg.client.shard.broadcastEval("this.destroy().then(() => process.exit())");
      } else {
        await msg.client.destroy();
        process.exit();
      }
    } catch(e) { u.errorHandler(e, msg); }
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addCommand({name: "madesk",
  description: "Request a feature for Discord",
  info: "Send a feature request to the Discord Trello board.",
  aliases: ["ma-desk"],
  syntax: "Requested Feature",
  permissions: (msg) => msg.guild?.id == "136569499859025920" || msg.member?.roles.cache.has(Module.config.roles.team) || msg.member?.roles.cache.has(Module.config.roles.mod),
  process: async (msg, suffix) => {
    if (suffix) {
      let content = msg.cleanContent.substr(msg.cleanContent.indexOf(" ")).trim();
      let trelloConfig = require("../config/trello.json");
      let card = {
        path: {
          board: 'MaDesk',
          list: 'NEW',
          card: content,
        },
        content: {
          cardDesc: `Submitted by ${msg.member.displayName} in ${msg.channel.name}.`,
          //cardLabelColors: "blue"
        }
      };
      Trello.send(trelloConfig, card, function(err, result){
        if (err) u.errorHandler(err, msg);
        else {
          msg.react("👌");
          msg.reply("Request received and put on Maldor's Desk!").then(u.clean);
        }
      });
    } else msg.reply("You need to tell me what your request is!");
  }
})
.addCommand({name: "ping",
  category: "Bot Admin",
  description: "Check bot ping.",
  hidden: true,
  process: (msg) => {
    msg.channel.send('Pinging...').then(sent => {
      sent.edit(`Pong! Took ${sent.createdTimestamp - (msg.editedTimestamp ? msg.editedTimestamp : msg.createdTimestamp)}ms`);
      if(msg.channel.id != Module.config.channels.botspam && !(msg.member?.roles.cache.has(Module.config.roles.mod) || msg.member?.roles.cache.has(Module.config.roles.management))) {
        u.clean(sent);
        u.clean(msg);
      }
    });
  }
})
.addCommand({name: "playing",
  category: "Bot Admin",
  hidden: true,
  description: "Set playing status",
  syntax: "[game]",
  aliases: ["setgame", "game"],
  process: (msg, suffix) => {
    if (suffix) msg.client.user.setActivity(suffix);
    else msg.client.user.setActivity("");
    msg.react("👌");
  },
  permissions: (msg) => (Module.config.adminId.includes(msg.author.id))
})
.addCommand({name: "pull",
  category: "Bot Admin",
  description: "Pull bot updates from git",
  hidden: true,
  process: (msg) => {
    let spawn = require("child_process").spawn;

    u.clean(msg);

    let cmd = spawn("git", ["pull"], {cwd: process.cwd()});
    let stdout = [];
    let stderr = [];

    cmd.stdout.on("data", data => {
      stdout.push(data);
    });

    cmd.stderr.on("data", data => {
      stderr.push(data);
    });

    cmd.on("close", code => {
      if (code == 0)
        msg.channel.send(stdout.join("\n") + "\n\nCompleted with code: " + code).then(u.clean);
      else
        msg.channel.send(`ERROR CODE ${code}:\n${stderr.join("\n")}`).then(u.clean);
    });
  },
  permissions: (msg) => (Module.config.ownerId === (msg.author.id))
})
.addCommand({name: "pulse",
  category: "Bot Admin",
  hidden: true,
  description: "Check the bot's heartbeat",
  permissions: (msg) => (Module.config.ownerId === (msg.author.id)),
  process: async function(msg, suffix) {
    try {
      let client = msg.client;

      let embed = u.embed()
      .setAuthor(client.user.username + " Heartbeat", client.user.displayAvatarURL())
      .setTimestamp();

      if (client.shard) {
        let guilds = await client.shard.fetchClientValues('guilds.cache.size');
        guilds = guilds.reduce((prev, val) => prev + val, 0);
        let channels = client.shard.fetchClientValues('channels.cache.size')
        channels = channels.reduce((prev, val) => prev + val, 0);
        let mem = client.shard.broadcastEval("Math.round(process.memoryUsage().rss / 1024 / 1000)");
        mem = mem.reduce((t, c) => t + c);
        embed
        .addField("Shards", `Id: ${client.shard.id}\n(${client.shard.count} total)`, true)
        .addField("Total Bot Reach", `${guilds} Servers\n${channels} Channels`, true)
        .addField("Shard Uptime", `${Math.floor(client.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(client.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(client.uptime / (60 * 1000)) % 60} minutes`, true)
        .addField("Shard Commands Used", `${client.commands.commandCount} (${(client.commands.commandCount / (client.uptime / (60 * 1000))).toFixed(2)}/min)`, true)
        .addField("Total Memory", `${mem}MB`, true);
        fetch("https://srhpyqt94yxb.statuspage.io/api/v2/summary.json").then(res => res.json())
            .then((json) => {
                for (const component of json.components) {
                    if (component.status != "operational" || suffix.indexOf("verbose") > -1) {
                        let emoji;
                        switch (component.status) {
                            case "operational":
                                emoji = "🟢"
                                break;
                            case "partial_outage":
                                emoji = "🟡";
                                break;
                            case "major_outage":
                                emoji = "🟠";
                            default:
                                emoji = "🔴";
                                break;
                        }
                        embed.addField(`Discord ${component.name} ${emoji}`, `**Status**: ${component.status}`);
                    }
                }
                 msg.channel.send({ embed: embed });
            }
         );
      } else {
        let uptime = process.uptime();
        embed
        .addField("Uptime", `Discord: ${Math.floor(client.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(client.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(client.uptime / (60 * 1000)) % 60} minutes\nProcess: ${Math.floor(uptime / (24 * 60 * 60))} days, ${Math.floor(uptime / (60 * 60)) % 24} hours, ${Math.floor(uptime / (60)) % 60} minutes`, true)
        .addField("Reach", `${client.guilds.cache.size} Servers\n${client.channels.cache.size} Channels\n${client.users.cache.size} Users`, true)
        .addField("Commands Used", `${client.commands.commandCount} (${(client.commands.commandCount / (client.uptime / (60 * 1000))).toFixed(2)}/min)`, true)
        .addField("Memory", `${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB`, true);
        fetch("https://srhpyqt94yxb.statuspage.io/api/v2/summary.json").then(res => res.json())
            .then((json) => {
                for (const component of json.components) {
                    if (component.status != "operational" || suffix.indexOf("verbose") > -1) {
                        let emoji;
                        switch (component.status) {
                            case "operational":
                                emoji = "🟢"
                                break;
                            case "partial_outage":
                                emoji = "🟡";
                                break;
                            case "major_outage":
                                emoji = "🟠";
                            default:
                                emoji = "🔴";
                                break;
                        }
                        embed.addField(`Discord ${component.name} ${emoji}`, `**Status**: ${component.status}`);
                    }
                }
                 msg.channel.send({ embed: embed });
            }
         );
      }
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "reload",
  category: "Bot Admin",
  hidden: true,
  syntax: "[file1.js] [file2.js]",
  description: "Reload command files.",
  info: "Use the command without a suffix to reload all command files.\n\nUse the command with the module name (including the `.js`) to reload a specific file.",
  process: (msg, suffix) => {
    u.clean(msg);
    let path = require("path");
    let files = (suffix ? suffix.split(" ") : fs.readdirSync(path.resolve(__dirname)).filter(file => file.endsWith(".js")));

    for (const file of files) {
      try {
        msg.client.moduleHandler.reload(path.resolve(__dirname, file));
      } catch(error) { msg.client.errorHandler(error, msg); }
    }
    msg.react("👌");
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addCommand({name: "reloadlib",
  category: "Bot Admin",
  hidden: true,
  syntax: "[file1.js] [file2.js]",
  description: "Reload local library files.",
  process: (msg, suffix) => {
    u.clean(msg);
    msg.react("👌");
    if (suffix) {
      const path = require("path");
      let files = suffix.split(" ").filter(f => f.endsWith(".js"));
      for (let file of files) {
        delete require.cache[require.resolve(path.dirname(require.main.filename), file)];
      }
    } else {
      msg.reply("You need to tell me which libraries to reload!").then(u.clean);
    }
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addCommand({name: "repo",
  description: "Get a link to the bot's source code.",
  aliases: ["source"],
  process: msg => msg.channel.send("Find my repository here:\n<https://github.com/Gaiwecoor/icarus4>")
})
.addCommand({name: "request",
  description: "Request a feature for Icarus",
  info: "Send a feature request to the bot Trello board.",
  syntax: "Requested Feature",
  permissions: (msg) => msg.author.id != "386553948443639818",
  process: (msg, suffix) => {
    if (suffix) {
      let content = msg.cleanContent.substr(msg.cleanContent.indexOf(" ")).trim();
      let trelloConfig = require("../config/trello.json");
      let card = {
        path: {
          board: 'Icarus',
          list: 'Requested Features',
          card: content,
        },
        content: {
          cardDesc: `Submitted by ${msg.author.username} in ${msg.channel.name}.`,
          cardLabelColors: "blue"
        }
      };
      Trello.send(trelloConfig, card, function(err, result){
        if (err) console.error(err);
        else {
          msg.react("👌");
          msg.reply("Request received!\n\nNote that if the request was for a *Discord* feature or a command which only gives a single static response, it'll be ignored here. Those can be submitted via `!madesk` by mods or team. This is for requesting features for Icarus that actually require coding.").then(u.clean);
        }
      });
    } else msg.reply("You need to tell me what your request is!");
  }
})
.addEvent("disconnect", async () => {
  try {
    let embed = u.embed()
    .setTimestamp()
    .setTitle("Bot Disconnect")
    .setDescription((Module.handler.client.shard ? ("Shard " + Module.handler.client.shard.id) : "Bot") + " has disconnected. I will try restarting the bot.");
    await u.errorLog.send({embed});
    process.exit();
  } catch(error) { u.errorHandler(error, "Bot Disconnect"); process.exit(); }
})
.addEvent("ready", () => {
  Module.client.guilds.cache.get(Module.config.ldsg).members.fetch();
})
.setInit(async (reload) => {
  try {
    if (!reload) {
      u.errorLog.send(u.embed().setTimestamp().setDescription("Bot is ready!"));
    }

    await doc.useServiceAccountAuth(google.creds);
    await doc.loadInfo();
    Module.config.sheets = new Map(doc.sheetsByIndex.map(s => [s.title, s]));
    Module.client.emit("loadConfig");
  } catch(error) { u.errorHandler(error, "botAdmin Load"); }
})
.setUnload(() => true);

module.exports = Module;
