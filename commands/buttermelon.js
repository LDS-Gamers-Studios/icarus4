const Augur = require("augurbot"),
  u = require("../utils/utils"),
  buttermelon = require("../data/buttermelon.json");

function buttermelonEdit(msg) {
  if ((msg.channel.id == "203518149809799168") && (msg.cleanContent.toLowerCase() == "test"))
    msg.channel.send((Math.random() < 0.8 ? "`pass`" : "`fail`"));

  let exclude = ['121033996439257092', '164784857296273408'];
  let roll = Math.random();
  if (roll < .3 && !msg.author.bot && !exclude.includes(msg.channel.id)) {
    //let banana = /[bß8ƥɓϐβбБВЬЪвᴮᴯḃḅḇÞ][a@∆æàáâãäåāăȁȃȧɑαдӑӓᴀᴬᵃᵅᶏᶐḁạảấầẩẫậắằẳẵặ4Λ]+([nⁿńňŋƞǹñϰпНhийӣӥѝνṅṇṉṋ]+[a@∆æàáâãäåāăȁȃȧɑαдӑӓᴀᴬᵃᵅᶏᶐḁạảấầẩẫậắằẳẵặ4Λ]+){2}/ig;
    if (msg.content.toLowerCase().includes("bananas")) {
      if (roll < .1)
        msg.channel.send({files: ["https://cdn.discordapp.com/attachments/154625360514777088/239045323522179073/buttermelons.jpg"]}).catch(u.errorHandler);
      else
        msg.channel.send("*buttermelons").catch(u.errorHandler);
    } else if (msg.content.toLowerCase().includes("banana")) {
      if (roll < .06)
        msg.channel.send({files: ["https://cdn.discordapp.com/attachments/136577505418018826/238764601951387648/buttermelon.jpg"]}).catch(u.errorHandler);
      else if (roll < .1)
        msg.channel.send({files: ["https://cdn.discordapp.com/attachments/96335850576556032/374995339997872128/YigaButtermelon_web.png"]}).catch(u.errorHandler);
      else
        msg.channel.send("*buttermelon").catch(u.errorHandler);
    }
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
  if (oldMsg.partial || !(oldMsg.cleanContent.toLowerCase().includes("banana")))
    buttermelonEdit(msg);
});

module.exports = Module;
