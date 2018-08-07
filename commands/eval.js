const Augur = require("augurbot");

const Module = new Augur.Module()
.addCommand({name: "eval",
  hidden: true,
  category: "Admin",
  process: (msg, suffix) => {
    if (msg.author.id !== Module.config.ownerId) {
      msg.channel.reply("stop it! Go away!");
      return;
    } else {
      try {
        let output = eval(suffix);
        msg.channel.send(output, {code: true});
      } catch(e) {
        msg.channel.send(`**ERROR:** ${e.name}\n\`\`\`\n${e.message}\`\`\``);
      }
    }
  },
  permissions: (msg) => msg.author.id === Module.config.ownerId
})
.addCommand({name: "seval",
  hidden: true,
  category: "Admin",
  process: (msg, suffix) => {
    if (msg.deletable) msg.delete();
    Module.handler.execute("eval", msg, suffix);
  },
  permissions: (msg) => msg.author.id === Module.config.ownerId
});

module.exports = Module;
