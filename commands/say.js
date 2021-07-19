const Augur = require("augurbot");
const chars = require("../utils/emojiCharacters");

const Module = new Augur.Module()
.addCommand({name: "say",
  syntax: "<stuff>",
  category: "Silly",
  hidden: true,
  process: (msg, suffix) => {
    u.clean(msg, 0);
    msg.channel.send(suffix);
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addCommand({name: "saveid",
  syntax: "<Identity Name>\n<Avatar URL>",
  category: "Silly",
  hidden: true,
  process: async (msg, suffix) => {
    let webhooks = await msg.channel.fetchWebhooks();
    if (webhooks.size == 0) {
      await msg.channel.createWebhook("Say As Hook");
    }
    let [username, avatarURL] = suffix.split("\n");
    if (avatarURL?.startsWith("<") && avatarURL?.endsWith(">")) avatarURL = avatarURL.substring(1, avatarURL.length - 1);
    const hasLink = /^http(s)?:\/\/(\w+(-\w+)*\.)+\w+/;
    if (hasLink.test(avatarURL)) {
      await Module.db.webhookId.save(msg.channel, username, avatarURL);
      msg.react("👌");
    } else {
      msg.reply("You need to give me a name and a URL:\n> Identity Name\n> Avatar URL").then(u.clean);
    }
    u.clean(msg);
  },
  permissions: (msg) => msg.guild && msg.channel.permissionsFor(msg.author).has("MANAGE_CHANNELS") && msg.channel.permissionsFor(msg.guild.me).has("MANAGE_WEBHOOKS")
})
.addCommand({name: "sayas",
  syntax: "<Identity Name>\n<Text>",
  category: "Silly",
  hidden: true,
  process: async (msg, suffix) => {
    let [username, ...text] = suffix.split("\n");
    let hookOptions = await Module.db.webhookId.getOptions(msg.channel, username);
    if (!hookOptions) {
      msg.reply("I couldn't find that identity! Try `!saveid` to create a new identity.").then(u.clean);
    } else {
      const webhooks = await msg.channel.fetchWebhooks();
      let webhook = webhooks.first();
      if (!webhook) {
        webhook = await msg.channel.createWebhook("Say As Hook");
      }

      if (msg.attachments.size > 0) {
        hookOptions.files = [];
        for (let [attachmentId, attachment] of msg.attachments) {
          hookOptions.files.push({attachment: attachment.url, name: attachment.name});
        }
      }

      webhook.send(text.join("\n"), hookOptions);
    }
    u.clean(msg, 0);
  },
  permissions: (msg) => msg.guild && msg.channel.permissionsFor(msg.author).has("MANAGE_CHANNELS") && msg.channel.permissionsFor(msg.guild.me).has("MANAGE_WEBHOOKS")
});

module.exports = Module;
