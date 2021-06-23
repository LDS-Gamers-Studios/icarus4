const Augur = require("augurbot"),
  u = require("../utils/utils"),
  Jimp = require("jimp");

const supportedFormats = ["png", "jpg", "jpeg", "bmp", "tiff", "gif"];

const Module = new Augur.Module()
.addCommand({name: "crop",
  description: "Randomly crop the last image posted by a user",
  syntax: "crop",
  aliases: ["crop"],
  process: async (msg, suffix) => {
    try {
      let processed = false;
      let messages = await msg.channel.messages.fetch({ limit: 100 });
      for (const [messageId, message] of messages) {
        if (message.author.bot) continue;
        if (message.attachments.size > 0) {
          let a = message.attachments.first();
          if (!supportedFormats.some(format => a.url.endsWith("." + format))) {
            continue;
          }
          processed = true;

          const cropped = await Jimp.read(a.url);

          let ogw = cropped.bitmap.width
          let ogh = cropped.bitmap.height

          // width
          let max = ogw * 9 / 10;
          let min = ogw / 10;
          let nw = Math.floor(Math.random() * (max - min) + min);

          // height
          max = ogh * 9 / 10;
          min = ogh / 10;
          let nh = Math.floor(Math.random() * (max - min) + min);

          //starting x
          max = ogw - nw;
          min = 1;
          let startX = Math.floor(Math.random() * (max - min) + min);

          //starting y
          max = ogh - nh;
          min = 1;
          let startY = Math.floor(Math.random() * (max - min) + min);

          cropped.crop(startX, startY, nw, nh)
          const canvas = new Jimp(nw, nh, 0x000000);
          canvas.blit(cropped,0,0);
          await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_PNG)]});
          break;
        }
      }
      if (!processed) msg.reply("I couldn't find any recent images to crop!").then(u.clean);
      u.clean(msg);
    } catch(error) { u.errorHandler(error, msg); }
  }
});

module.exports = Module;
