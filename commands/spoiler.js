const Augur = require("augurbot"),
  u = require("../utils/utils");

async function collector(msg) {
  try {
    let existing = (msg.reactions.get("💬") ? msg.reactions.get("💬").users.keyArray() : []);
    let bot = msg.client;
    let reactions = await msg.awaitReactions(
      (reaction, user) => ((reaction.emoji.name == "💬") && !user.bot),
      {max: 1}
    );
    let user = reactions.first().users.find(u => !existing.includes(u.id));
    let spoiler = await Module.db.spoiler.fetch(msg.id);
    if (spoiler && user) {
      let author = await bot.fetchUser(spoiler.authorId)
      let embed = u.embed();
      embed.setAuthor(spoiler.authorName, author.displayAvatarURL)
      .setColor(Module.config.color)
      .setDescription(spoiler.content)
      .setTimestamp(spoiler.timestamp)
      .setTitle(`Spoiler${(spoiler.channelName ? (" in #" + spoiler.channelName) : "")}${(spoiler.topic ? " about " + spoiler.topic : "")}:`);

      user.send(embed);
    }
    collector(msg);
  } catch(e) {
    u.alertError(e);
  }
}

const Module = new Augur.Module()
.addCommand({name: "spoiler",
	description: "Hide your spoilers",
	syntax: "Spoiler Text [## Spoiler Topic]",
	info: "Hides your spoilers, so others can choose whether to see it.",
	aliases: ["spoil", "spoilers"],
  permissions: (msg) => (msg.guild && msg.channel.permissionsFor(msg.client.user).has("MANAGE_MESSAGES")),
	process: async (msg, suffix) => {
    try {
      u.clean(msg, 0);

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
      collector(m);
    } catch(e) { u.alertError(e, msg); }
	}
})
.setInit(() => {
  setTimeout(async () => {
    try {
      let bot = Module.handler.client;
      let spoilers = await Module.db.spoiler.fetchAll();
      spoilers = spoilers.filter(s => bot.channels.has(s.channelId));
      spoilers.forEach(async spoiler => {
        try {
          let msg = await bot.channels.get(spoiler.channelId).fetchMessage(spoiler.spoilerId);
          collector(msg);
        } catch(err) {
          Module.handler.errorHandler(e);
        }
      });
    } catch(e) {
      Module.handler.errorHandler(e);
    }
  }, 5000);
});

module.exports = Module;
