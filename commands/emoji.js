const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "emoji",
  description: "Increases custom emoji size",
  syntax: ":emoji:",
  info: "Displays full resolution emoji. Only enlarges emoji to full resolution uploaded to Discord.",
  aliases: ["emote", "embiggen"],
  process: (msg, suffix) => {
    u.clean(msg, 0);

    let test = /<(a?):(\w+):(\d+)>/i;
    let id = test.exec(suffix);
    let ext = (id[1] ? ".gif" : ".png");
    if (id) msg.channel.send({files: [{name: id[2] + ext, attachment: `https://cdn.discordapp.com/emojis/${id[3]}.${(id[1] ? "gif" : "png")}`}]});
  },
  permissions: (msg) => (msg.guild && (msg.channel.permissionsFor(msg.author).has("ATTACH_FILES") || msg.channel.permissionsFor(msg.author).has("USE_EXTERNAL_EMOJIS") || msg.channel.permissionsFor(msg.author).has("EMBED_LINKS")))
});

module.exports = Module;
