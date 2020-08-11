const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "spoiler",
  description: "Hide your spoilers",
  syntax: "Spoiler Text [## Spoiler Topic]",
  info: "Hides your spoilers, so others can choose whether to see it.",
  aliases: ["spoil", "spoilers"],
  permissions: (msg) => (msg.guild && msg.channel.permissionsFor(msg.client.user).has("MANAGE_MESSAGES")),
  process: async (msg, suffix) => {
    try {
      u.clean(msg, 150);

      let file = ((msg.attachments.size > 0) ? { "file": msg.attachments.first().url } : null);
      let topicTag = suffix.indexOf("##");
      let topic = (topicTag > 0 ? suffix.substr(topicTag + 2).trim() : null);
      let content = (topicTag > 0 ? suffix.substr(0, topicTag).trim() : suffix);

      let m = await msg.channel.send(`${msg.author} just posted a spoiler${(topic ? " about " + topic : "")}.\nReact to this message with "💬" to see its content.`);

      let spoiler = {
        spoilerId: m.id,
        authorName: (msg.guild ? msg.member.displayName : msg.author.username),
        authorId: (msg.author.id),
        channelId: (msg.guild ? msg.channel.id : null),
        channelName: (msg.guild ? msg.channel.name : null),
        content: content,
        topic: topic
      };
      await Module.db.spoiler.save(spoiler);
      await m.react("💬");
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addEvent("messageReactionAdd", (reaction, user) => {
  if (reaction.emoji.name == "💬" && !user.bot) {
    let message = reaction.message;
    Module.db.spoiler.fetch(message.id).then(spoiler => {
      if (spoiler) {
        let bot = Module.handler.client;
        bot.fetchUser(spoiler.authorId).then(author => {
          let embed = u.embed()
          .setAuthor(spoiler.authorName, author.displayAvatarURL)
          .setDescription(spoiler.content)
          .setTimestamp(spoiler.timestamp)
          .setTitle(`Spoiler${(spoiler.channelName ? (" in #" + spoiler.channelName) : "")}${(spoiler.topic ? " about " + spoiler.topic : "")}:`);

          user.send(embed);
        }).catch(e => u.errorHandler(e, "Send spoiler to user error"));
      }
    }).catch(e => u.errorHandler(e, "Fetch spoiler error"));
  }
})
.setUnload(() => true);

module.exports = Module;
