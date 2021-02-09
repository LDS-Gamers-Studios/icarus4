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
    let img;

    if (msg.attachments.size > 0) {
      original = msg.attachments.first().url;
    } else if (match = urlexp.exec(suffix)) {
      original = match[1];
    } else {
      original = (await u.getMention(msg, false) || msg.author).displayAvatarURL({size: 256, format: "png"});
    }

    try {
      img = await Jimp.read(original);
    } catch (error) {
      return msg.reply("I couldn't use that image! Make sure its a PNG, JPG, or JPEG.")
    };


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
  } catch(error) { u.errorHandler(error, msg); }
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
  process: async (msg) => {
    try {
      let user, member;
      if (msg.guild) member = (await u.getMention(msg)) || msg.member;
      user = (member ? member.user : (msg.mentions.users.first() || msg.author));
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
  process: async (msg, suffix) => {
    try {
      let target;
      let urlexp = /\<?(https?:\/\/\S+)\>?(?:\s+)?(\d*)/;
      let av;

      if (msg.attachments.size > 0) {
        target = msg.attachments.first().url;
      } else if (match = urlexp.exec(suffix)) {
        target = match[1];
      } else {
        target = (await u.getMention(msg, false) || msg.author).displayAvatarURL({size: 512, format: "png"});
      }

      try {
        av = await Jimp.read(target);
      } catch (error) {
        return msg.reply("I couldn't use that image! Make sure its a PNG, JPG, or JPEG.")
      };

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
      let image;
      let urlexp = /\<?(https?:\/\/\S+)\>?(?:\s+)?(\d*)/;
      let match;

      if (msg.attachments.size > 0) {
        original = msg.attachments.first().url;
        color = parseInt(suffix.replace(/<@!?\d+>/g, ""), 10);
      } else if (match = urlexp.exec(suffix)) {
        original = match[1];
        color = parseInt(match[2], 10);
      } else if ((color = parseInt(suffix, 10)) && suffix.split(" ").length == 1) {
        original = msg.author.displayAvatarURL({size: 512, format: "png"});
      } else {
        original = (await u.getMention(msg, false) || msg.author).displayAvatarURL({size: 512, format: "png"});
        color = parseInt(suffix.replace(/<@!?\d+>/g, ""), 10);
      }

      color = color || (10 * (Math.floor(Math.random() * 35) + 1));

      try {
        image = await Jimp.read(original);
      } catch (error) {
        return msg.reply("I couldn't use that image! Make sure its a PNG, JPG, or JPEG.")
      };
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
      const target = await u.getMention(msg, false) || msg.author;
      const staticURL = target.displayAvatarURL({size: 128, dynamic: false, format: "png"});

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
.addCommand({name: "greyscale",
  description: "Greyscale an Avatar",
  aliases: ["grayscale", "bw"],
  category: "Silly",
  process: async (msg, suffix) => {
    try {
      let target;
      let urlexp = /\<?(https?:\/\/\S+)\>?(?:\s+)?(\d*)/;
      let av;

      if (msg.attachments.size > 0) {
        target = msg.attachments.first().url;
      } else if (match = urlexp.exec(suffix)) {
        target = match[1];
      } else {
        target = (await u.getMention(msg, false) || msg.author).displayAvatarURL({size: 512, format: "png"});
      }

      try {
        av = await Jimp.read(target);
      } catch (error) {
        return msg.reply("I couldn't use that image! Make sure its a PNG, JPG, or JPEG.")
      };

      av.color([{ apply: "desaturate", params: [100] }]);

      await msg.channel.send({files: [await av.getBufferAsync(Jimp.MIME_PNG)]});
    } catch(e) { u.errorHandler(e, msg); }
  }
})
.addCommand({name: "invert",
  description: "Invert an avatar or attached image",
  category: "Silly",
  process: async (msg, suffix) => {
    try {
      let original;
      let img;

      let urlexp = /\<?(https?:\/\/\S+)\>?(?:\s+)?(\d*)/;
      let match;

      if (msg.attachments.size > 0) {
        original = msg.attachments.first().url;
      } else if (match = urlexp.exec(suffix)) {
        original = match[1];
      } else {
        original = (await u.getMention(msg, false) || msg.author).displayAvatarURL({size: 512, format: "png"});
      }

      try {
        img = await Jimp.read(original);
      } catch (error) {
        return msg.reply("I couldn't use that image! Make sure its a PNG, JPG, or JPEG.")
      };

      for (let x = 0; x < img.bitmap.width; x++) {
        for (let y = 0; y < img.bitmap.height; y++) {
          let {r, g, b, a} = Jimp.intToRGBA(img.getPixelColor(x, y));
          img.setPixelColor(Jimp.rgbaToInt(255 - r, 255 - g, 255 - b, a), x, y);
        }
      }
      msg.channel.send({files: [await img.getBufferAsync(Jimp.MIME_PNG)]});
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "personal",
  description: "For when you take something personally",
  category: "Silly",
  process: async (msg, suffix) =>{
    try {
      let image = await Jimp.read('https://cdn.discordapp.com/attachments/789694239197626371/808446253737181244/personal.png');
      let target = await Jimp.read(suffix?.toLowerCase() == 'ldsg' ? 'https://cdn.discordapp.com/attachments/762899042363113482/808707034983170138/UH1D8seS_400x400.png' : (await u.getMention(msg)?.user || msg.author).displayAvatarURL({format: 'png', size: 512}));
      let mask = await Jimp.read('./storage/mask.png');
      mask.resize(350,350);
      target.resize(350, 350);
      target.mask(mask);
      image.blit(target, 1050, 75);
      await msg.channel.send({files: [await image.getBufferAsync(Jimp.MIME_PNG)]});
    } catch(e) {u.errorHandler(e, msg);}
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
