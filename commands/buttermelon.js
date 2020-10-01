const Augur = require("augurbot"),
  u = require("../utils/utils"),
  buttermelon = require("../data/buttermelon.json");

function buttermelonEdit(msg) {
  let exclude = ['121033996439257092', '164784857296273408'];
  if (!msg.author.bot && !exclude.includes(msg.channel.id)) {
    //let banana = /[bß8ƥɓϐβбБВЬЪвᴮᴯḃḅḇÞ][a@∆æàáâãäåāăȁȃȧɑαдӑӓᴀᴬᵃᵅᶏᶐḁạảấầẩẫậắằẳẵặ4Λ]+([nⁿńňŋƞǹñϰпНhийӣӥѝνṅṇṉṋ]+[a@∆æàáâãäåāăȁȃȧɑαдӑӓᴀᴬᵃᵅᶏᶐḁạảấầẩẫậắằẳẵặ4Λ]+){2}/ig;
    let roll = Math.random();
    if (/bananas/.test(msg.content.toLowerCase())) {
      if (roll < .1)
        msg.channel.send({files: ["https://cdn.discordapp.com/attachments/154625360514777088/239045323522179073/buttermelons.jpg"]}).catch(u.errorHandler);
      else if (roll < .3)
        msg.channel.send("*buttermelons").catch(u.errorHandler);
    } else if (/banana/.test(msg.content.toLowerCase().replace(/(\*|_)/ig, ""))) {
      if (roll < .06)
        msg.channel.send({files: ["https://cdn.discordapp.com/attachments/136577505418018826/238764601951387648/buttermelon.jpg"]}).catch(u.errorHandler);
      else if (roll < .1)
        msg.channel.send({files: ["https://cdn.discordapp.com/attachments/96335850576556032/374995339997872128/YigaButtermelon_web.png"]}).catch(u.errorHandler);
      else if (roll < .3)
        msg.channel.send("*buttermelon").catch(u.errorHandler);
    }

    if ((msg.channel.id == "203518149809799168") && (msg.cleanContent.toLowerCase() == "test"))
      msg.channel.send((Math.random() < 0.8 ? "`pass`" : "`fail`"));
  }
}

const Module = new Augur.Module()
.addCommand({name: "buttermelon",
  description: "Buttermelon facts",
  aliases: ["buttermelonfacts"],
  category: "Silly",
  process: (msg) => {
    msg.channel.send("🍌 " + u.rand(buttermelon.facts)).catch(u.errorHandler);
  }
})
.addCommand({name: "buttermelonhistory",
  description: "History of the Buttermelon",
  category: "Silly",
  process: (msg) => {
    msg.channel.send("http://ytcropper.com/cropped/lY59de2f95eaaba");
  }
})
.addEvent("message", buttermelonEdit)
.addEvent("messageUpdate", (oldMsg, msg) => {
  if (!(/banana/.test(oldMsg.cleanContent.toLowerCase())))
    buttermelonEdit(msg);
});

module.exports = Module;
