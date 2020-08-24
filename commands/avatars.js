const Augur = require("augurbot");
const u = require('../utils/utils');
const Jimp = require("jimp");

async function popart(msg, initialTransform) {
  try {
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
.addCommand({name: "avatar",
  description: "Get a user's avatar",
  syntax: "[@user]",
  category: "Members",
  process: (msg) => {
    try {
      let user = msg.mentions.users.first() || msg.author;
      let member = ((msg.guild) ? msg.guild.members.get(user.id) : null);
      let name = (member ? member.displayName : user.username);
      let embed = u.embed()
      .setAuthor(name)
      .setDescription(u.escapeText(name) + "'s Avatar")
      .setImage(user.displayAvatarURL({size: 512, dynamic: true}));
      msg.channel.send({embed});
    } catch(error) { u.errorHandler(error, msg); }
  },
})
.addCommand({name: "blurple",
  description: "Blurple an Avatar",
  category: "Silly",
  process: async (msg) => {
    try {
      let target = msg.mentions.users.first() || msg.author;
      let av = await Jimp.read(target.displayAvatarURL({size: 512}));
      av.color([
        { apply: "desaturate", params: [100] },
        { apply: "saturate", params: [47.7] },
        { apply: "hue", params: [227] }
      ]);

      await msg.channel.send({files: [await av.getBufferAsync(Jimp.MIME_PNG)]});
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "colorme",
  description: "Colorize an avatar or attached image",
  category: "Silly",
  process: async (msg, suffix) => {
    try {
      let color;
      let original;

      let urlexp = /\<?(https?:\/\/\S+)\>?(?:\s+)?(\d*)/;
      let match;

      if (msg.attachments.size > 0) {
        original = msg.attachments.first().url;
        color = parseInt(suffix.replace(/<@!?\d+>/g, ""), 10);
      } else if (match = urlexp.exec(suffix)) {
        original = match[1];
        color = parseInt(match[2], 10);
      } else {
        original = (msg.mentions.users.first() || msg.author).displayAvatarURL({size: 512});
        color = parseInt(suffix.replace(/<@!?\d+>/g, ""), 10);
      }
      color = color || (10 * (Math.floor(Math.random() * 35) + 1));

      let image = await Jimp.read(original);
      image.color([
        { apply: "hue", params: [color] }
      ]);
      await msg.channel.send({files: [await image.getBufferAsync(Jimp.MIME_PNG)]});
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "flex",
  description: "Show it off.",
  category: "Silly",
  process: async (msg) => {
    try {
      const arm = "https://cdn.discordapp.com/attachments/488887953939103775/545672817354735636/509442648080121857.png";
      const target = msg.mentions.users.first() || msg.author;
      const staticURL = target.displayAvatarURL({size: 128, dynamic: false});

      const right = await Jimp.read(arm);
      const mask = await Jimp.read("./storage/mask.png");
      const avatar = await Jimp.read(staticURL);
      const canvas = new Jimp(368, 128, 0x00000000);

      if (Math.random() > 0.5) right.flip(false, true);
      const left = right.clone().flip(true, (Math.random() > 0.5));

      avatar.resize(128, 128);
      avatar.mask(mask, 0, 0);

      canvas.blit(left, 0, 4);
      canvas.blit(right, 248, 4);

      canvas.blit(avatar, 120, 0);

      await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_PNG)]});
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
