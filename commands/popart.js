const Augur = require("augurbot");
const u = require('../utils/utils');

async function popart(msg, initialTransform) {
  try {
    const Jimp = require("jimp");
    let original;
    let content = msg.cleanContent.split(" ");
    content.shift();
    let suffix = content.join(" ");
    let urlexp = /\<?(https?:\/\/\S+)\>?(?:\s+)?(\d*)/;
    let match;

    if (msg.attachments.size > 0) {
      original = msg.attachments.first().url;
    } else if (match = urlexp.exec(suffix)) {
      original = match[1];
    } else {
      original = (msg.mentions.users.first() || msg.author).displayAvatarURL({size: 256});
    }

    const img = await Jimp.read(original);
    const canvas = new Jimp(536, 536, 0xffffffff);

    img.resize(256, 256);

    img.color(initialTransform);
    canvas.blit(img, 8, 272);

    img.color([{apply: "spin", params: [60]}]);
    canvas.blit(img, 272, 8);

    img.color([{apply: "spin", params: [60]}]);
    canvas.blit(img, 272, 272);

    img.color([{apply: "spin", params: [120]}]);
    canvas.blit(img, 8, 8);

    return canvas;
  } catch(error) { u.alertError(error, msg); }
}

const Module = new Augur.Module()
.addCommand({name: "andywarhol",
  description: "'Andy Warhol' an avatar or attached image",
  category: "Silly",
  process: async (msg, suffix) => {
    try {
      const canvas = await popart(msg, [{ apply: "spin", params: [60] }]);
      await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_JPEG)]});
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "popart",
  description: "'Pop art' an avatar or attached image",
  category: "Silly",
  process: async (msg, suffix) => {
    try {
      const canvas = await popart(msg, [
        { apply: "desaturate", params: [100] },
        { apply: "saturate", params: [50] }
      ]);
      await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_JPEG)]});
    } catch(e) { u.errorHandler(e, msg); }
  }
});

module.exports = Module;
