const Augur = require("augurbot"),
  u = require("../utils/utils"),
  {CollegiateDictionary, WordNotFoundError} = require("mw-dict");

const Oxford = require("oxford-dictionary-api");

var dict, oxford;

const Module = new Augur.Module()
.addCommand({name: "define",
  description: "Define a word",
  syntax: "<word>",
  alisases: ["dictionary"],
  process: (msg, suffix) => {
    suffix = suffix.replace(/\?/g, "").trim();
    if (!suffix) msg.reply("you need to give me a word to define!");
    else {
      oxford.find(suffix, (err, defs) => {
        if (err && err == "No such entry found") return msg.reply(`I couldn't find a definition for ${suffix}.`);
        else if (err) return u.alertError(err, msg);
        defs = defs.results.filter(d => d.word.toLowerCase() == suffix.toLowerCase());

        let embed = u.embed()
        .setTitle(suffix)
        .setColor(0x00dbf2)
        .setFooter("Powered by Oxford Dictionaries");

        if (defs.length > 0) {
          for (let d = 0; d < defs.length; d++) {
            let def = defs[d];
            for (let l = 0; l < def.lexicalEntries.length; l++) {
              let lentry = def.lexicalEntries[l];
              let title = `${lentry.text} (${lentry.lexicalCategory})`;
              let description = [];
              for (let e = 0; e < lentry.entries.length; e++) {
                let entry = lentry.entries[e];
                for (let s = 0; s < entry.senses.length; s++) {
                  let sense = entry.senses[s];
                  description.push(`${s + 1}: ${sense.definitions.join("\n   ")}`);
                  if (sense.subsenses) {
                    for (let ss = 0; ss < sense.subsenses.length; ss++) {
                      let subsense = sense.subsenses[ss];
                      description.push(`   ${s + 1}.${ss + 1}: ${subsense.definitions.join("\n     ")}`);
                    }
                  }
                }
              }
              embed.addField(title, description.join("\n"));
            }
          }
        } else embed.setDescription(`No results found for ${suffix}.`);

        msg.channel.send({embed});
      });
    }
  }
})
.setInit(() => {
  dict = new CollegiateDictionary(Module.config.api.mw.dictionary);
  oxford = new Oxford(Module.config.api.oxford.id, Module.config.api.oxford.key);
});

module.exports = Module;
