const Augur = require("augurbot"),
  fs = require("fs"),
  path = require("path"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "pull",
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
.addCommand({name: "playing",
	description: "Set playing status",
	syntax: "[game]",
	aliases: ["setgame", "game"],
	process: (msg, suffix) => {
		if (suffix) msg.client.user.setActivity(suffix);
		else msg.client.user.setGame("");
	},
	permissions: (msg) => (Module.config.adminId.includes(msg.author.id))
})
.addCommand({name: "ping",
	description: "Check bot ping.",
	hidden: true,
	process: (msg) => {
		msg.channel.send('Pinging...').then(sent => {
  			sent.edit(`Pong! Took ${sent.createdTimestamp - (msg.editedTimestamp ? msg.editedTimestamp : msg.createdTimestamp)}ms`);
		});
	}
})
.addCommand({name: "pulse",
  category: "Admin",
  description: "Check the bot's heartbeat",
  permissions: (msg) => (Module.config.ownerId === (msg.author.id)),
  process: async function(msg, suffix) {
    let bot = msg.client;
    let Handler = Module.handler;

    let embed = u.embed()
    .setAuthor(bot.user.username + " Heartbeat", bot.user.displayAvatarURL)
    .setTimestamp();

    if (bot.shard) {
      let guilds = await bot.shard.fetchClientValues('guilds.size');
      guilds = guilds.reduce((prev, val) => prev + val, 0);
      let channels = bot.shard.fetchClientValues('channels.size')
      channels = channels.reduce((prev, val) => prev + val, 0);
      let mem = bot.shard.broadcastEval("Math.round(process.memoryUsage().rss / 1024 / 1000)");
      mem = mem.reduce((t, c) => t + c);
      embed
      .addField("Shards", `Id: ${bot.shard.id}\n(${bot.shard.count} total)`, true)
      .addField("Total Bot Reach", `${guilds} Servers\n${channels} Channels`, true)
      .addField("Shard Uptime", `${Math.floor(bot.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(bot.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(bot.uptime / (60 * 1000)) % 60} minutes`, true)
      .addField("Shard Commands Used", `${Handler.commandCount} (${(Handler.commandCount / (bot.uptime / (60 * 1000))).toFixed(2)}/min)`, true)
      .addField("Total Memory", `${mem}MB`, true);

      msg.channel.send({embed:embed});
    } else {
      let uptime = process.uptime();
      embed
      .addField("Uptime", `Discord: ${Math.floor(bot.uptime / (24 * 60 * 60 * 1000))} days, ${Math.floor(bot.uptime / (60 * 60 * 1000)) % 24} hours, ${Math.floor(bot.uptime / (60 * 1000)) % 60} minutes\nProcess: ${Math.floor(uptime / (24 * 60 * 60))} days, ${Math.floor(uptime / (60 * 60)) % 24} hours, ${Math.floor(uptime / (60)) % 60} minutes`, true)
      .addField("Reach", `${bot.guilds.size} Servers\n${bot.channels.size} Channels\n${bot.users.size} Users`, true)
      .addField("Commands Used", `${Handler.commandCount} (${(Handler.commandCount / (bot.uptime / (60 * 1000))).toFixed(2)}/min)`, true)
      .addField("Memory", `${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB`, true);

      msg.channel.send({embed: embed});
    }
  }
})
.addCommand({name: "gotobed",
  category: "Admin",
  hidden: true,
  aliases: ["q"],
  process: async function(msg) {
    await msg.channel.send("Going to bed now... :bed:");

    let files = fs.readdirSync(path.resolve(process.cwd(), "./commands"));

    files.forEach(file => {
      Module.handler.unload(path.resolve(process.cwd(), "./commands/", file));
    });

    if (msg.client.shard) {
      msg.client.shard.broadcastEval("this.destroy().then(() => process.exit())");
    } else {
      await msg.client.destroy();
      process.exit();
    }
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addCommand({name: "reload",
  category: "Admin",
  syntax: "[file1.js] [file2.js]",
  description: "Reload command files.",
  info: "Use the command without a suffix to reload all command files.\n\nUse the command with the module name (including the `.js`) to reload a specific file.",
  process: (msg, suffix) => {
    u.clean(msg);
    let path = require("path");
    let files = (suffix ? suffix.split(" ") : fs.readdirSync(path.resolve(process.cwd(), "./commands")));

    files.forEach(file => {
      Module.handler.reload(path.resolve(process.cwd(), "./commands/", file));
    });

    msg.channel.send("Reloaded " + files.join(", ")).then(u.clean);
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.setInit(() => {
  Module.handler.client.guilds.get(Module.config.ldsg).fetchMembers();
  u.errorLog.send(u.embed().setTimestamp().setDescription("Bot is ready!"));
});

module.exports = Module;
