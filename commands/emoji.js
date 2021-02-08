const Augur = require("augurbot"),
  u = require("../utils/utils"),
  Jimp = require('jimp'),
  emojiUnicode = require('emoji-unicode'),
  svgToImg = require('svg-to-img')
  request = require('request');

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
    else if (emojiUnicode(suffix)){
      request(`https://twemoji.maxcdn.com/v/latest/svg/${unicode(args)}.svg`, async function(err, response, body){
        const image = await svgToImg.from(body).toPng()
        return message.channel.send({files: [image]})
      })
    }
        
        
  },
  permissions: (msg) => (msg.guild && (msg.channel.permissionsFor(msg.author).has("ATTACH_FILES") || msg.channel.permissionsFor(msg.author).has("USE_EXTERNAL_EMOJIS") || msg.channel.permissionsFor(msg.author).has("EMBED_LINKS")))
});

module.exports = Module;
