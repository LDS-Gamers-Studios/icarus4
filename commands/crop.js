const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "crop",
  description: "Randomly crop the last image posted by a user",
  syntax: "crop",
  aliases: ["crop"],
  process: (msg, suffix) => {
    let processed = false;
    msg.channel.fetchMessages({ limit: 100 }).then(messages => {
      if (processed){
        return;
      }
      messages.forEach(async function (value, key, map) {
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

          let ogw= cropped.bitmap.width
          let ogh= cropped.bitmap.height

          // width
          let max = ogw * 9/10;
          let min = ogw /10;
          let nw = Math.floor(Math.random() * (max - min) + min);

          // height
          max = ogh * 9/10;
          min = ogh /10;
          let nh = Math.floor(Math.random() * (max - min) + min);

          //starting x
          max=ogw -nw;
          min = 1;
          let startX = Math.floor(Math.random() * (max - min) + min);  

          //starting y
          max=ogh -nh;
          min = 1;
          let startY = Math.floor(Math.random() * (max - min) + min);  


          cropped.crop(startX, startY, nw, nh)
          const canvas = new Jimp(nw, nh, 0x000000);
          canvas.blit(cropped,0,0);
          await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_PNG)]});
        } catch(e) { u.alertError(e, msg) }

        });
      }
      })
    })
    .catch(e => u.alertError(e, msg));
    u.clean(msg);
  }
})

module.exports = Module;
