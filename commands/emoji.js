const Augur = require("augurbot"),
  u = require("../utils/utils"),
  Jimp = require('jimp'),
  emojiUnicode = require('emoji-unicode'),
  svgToImg = require('svg-to-img'),
  axios = require('axios');

const Module = new Augur.Module()
.addCommand({name: "emoji",
  description: "Increases emoji size. Use multiple seperated by a space to combine them",
  syntax: ":emoji:",
  info: "Displays full resolution emoji. You can combine up to 25.",
  aliases: ["emote", "embiggen"],
  process: (msg, suffix) => {
    u.clean(msg, 0);

    let test = /<(a?):(\w+):(\d+)>/i;
    let rows = [], cols = 1;
    
    for (let row of suffix.split('\n')) {
      let characters = [];
      for (let character of row.split(' '))
        if(character != '' && character != ' ') characters.push(character);
      rows.push(characters);
    }
    for (let row of rows)
      if (row.length > cols) cols = row.length;
    if (rows.length == 1 && cols == 1) {
      let id = test.exec(suffix);
      if (id) return msg.channel.send({files: [`https://cdn.discordapp.com/emojis/${id[2]}.${id[1] ?'gif':'png'}`]});
    }
    if (rows.length * cols.length > 25) return msg.channel.send("That's too many emojis! The limit is 25.").then(u.clean);
    let canvas = new Jimp(150 * cols, 150 * rows.length, 0x00000000);
    let o = 1, a = 0; //o=y, a=x
    for (y of rows) {
      for(x of y.split(' ')){
        let id = test.exec(x);
        let image;
        if(x == '[]'){
          image = new Jimp(150, 150, 0x00000000);
          canvas.blit(image, 150 * a, 150 * (o-1));
        }
        else if(id){
          try{image = await Jimp.read(`https://cdn.discordapp.com/emojis/${id[2]}.${(id[1] ? "gif" : "png")}`)}catch{msg.channel.send(`I couldn't enlarge the emoji ${x}.`);break};
          image.resize(150, 150);
          canvas.blit(image, 150 * a, 150 * (o-1));
        }
        else{
          let requested;
          try{requested = await axios.get(`https://twemoji.maxcdn.com/v/latest/svg/${emojiUnicode(x).replace(/ fe0f/g, '').replace(/ /g, '-')}.svg`)}catch{msg.channel.send(`I couldn't enlarge the emoij ${x}.`);break};
          let toPng = await svgToImg.from(requested.data).toPng();
          image = await Jimp.read(toPng);
          canvas.blit(image, 150 * a, 150 * (o-1));
        }
        a++;
        if(a == y.split(' ').length && o == rows.length) return await msg.channel.send({files: [await canvas.getBufferAsync(Jimp.MIME_PNG)]});
        if(a == y.split(' ').length){a=0;o++};
      }
    }     
  },
  permissions: (msg) => (msg.guild && (msg.channel.permissionsFor(msg.author).has("ATTACH_FILES") || msg.channel.permissionsFor(msg.author).has("USE_EXTERNAL_EMOJIS") || msg.channel.permissionsFor(msg.author).has("EMBED_LINKS")))
});

module.exports = Module;
