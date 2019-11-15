const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "crop",
  description: "Randomly crop the last image posted by a user",
  syntax: "crop",
  aliases: ["crop"],
  process: (msg, suffix) => {
    processed = false;
    msg.channel.fetchMessages({ limit: 100 }).then(messages => {
      if (processed){
        return;
      }
      msg.forEach(async function (value, key, map) {
      if (processed ||value.author.bot){
        return;
      }
      if (value.attachments.size >0){
        value.attachments.forEach(async function (a, k, m){
        if (processed){
          return;
        }
        processed =true;
        try {
          const Jimp = require("jimp");
          const cropped = await Jimp.read(a.url);

          ogw= cropped.bitmap.width
          ogh= cropped.bitmap.height

          // width
          max = ogw * 9/10;
          min = ogw /10;
          nw = Math.floor(Math.random() * (max - min) + min);

          // height
          max = ogh * 9/10;
          min = ogh /10;
          nh = Math.floor(Math.random() * (max - min) + min);

          //starting x
          max=ogw -nw;
          min = 1;
          var startX = Math.floor(Math.random() * (max - min) + min);  

          //starting y
          max=ogh -nh;
          min = 1;
          var startY = Math.floor(Math.random() * (max - min) + min);  


          cropped.crop(startX, startY, nw, nh)
          const canvas = new Jimp(nw, nh, 0x000000);
          canvas.blit(cropped,0,0);
          await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_PNG)]});
        } catch(e) { console.log(e) }

        });
      }
      })
    })
    .catch(console.error);
    message.delete();

  }
})

module.exports = Module;
