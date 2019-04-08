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
  process: async (msg, suffix) => {
    suffix = suffix.replace(/\?/g, "").trim();
    if (!suffix) msg.reply("you need to give me a word to define!");
    else {
      try {
        let defs = (await dict.lookup(suffix)).filter(d => d.word == suffix);
        let description = "";
        let embed = u.embed()
        .setColor([38, 120, 206])
        .setThumbnail("https://www.dictionaryapi.com/images/info/branding-guidelines/mw-logo-dark-background-100x100.png")
        .setFooter("Provided by Merriam-Webster's Collegiate® Dictionary");

        for (let i = 0; i < defs.length; i++) {
          let entry = defs[i];
          description += `\n\n**${entry.word}** (${entry.functional_label})\n`;
          if (entry.etymology) description += `From: ${entry.etymology}\n`;

          for (let j = 0; j < entry.definition.length; j++) {
            let def = entry.definition[j];
            if (def.meanings) description += "\n" + (def.number ? def.number : "") + def.meanings.join("\n");
            if (def.senses && def.senses.length > 0) {
              for (let k = 0; k < def.senses.length; k++) description += "\n" + (def.number ? def.number : "") + (def.senses[k].number ? def.senses[k].number : "") + def.senses[k].meanings.join("\n");
            }
          }
        }

        embed.setDescription(description.trim().slice(0, 2000));
        msg.channel.send(embed);
      } catch(e) {
        if (e instanceof WordNotFoundError) {
          msg.channel.send(`I couldn't find a definition for ${suffix}.${e.suggestions.length > 0 ? " Did you mean one of these?\n" + e.suggestions.join(", ") : ""}`);
        } else u.alertError(e, msg);
      }
    }
  }
})
.addCommand({name: "oxford",
  description: "Define a word",
  syntax: "<word>",
  alisases: ["dictionary"],
  process: async (msg, suffix) => {
    suffix = suffix.replace(/\?/g, "").trim();
    if (!suffix) msg.reply("you need to give me a word to define!");
    else {
      try {
        let def = (await oxford.lookup(suffix)).results.filter(d => d.word.toLowerCase() == suffix.toLowerCase());
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
                  for (let ss = 0; ss < sense.subsenses.length; ss++) {
                    description.push(`   ${s + 1}.${ss + 1}: ${subsense.definitions.join("\n     ")}`);
                  }
                }
              }
              embed.addField(title, description.join("\n"));
            }
          }
        } else embed.setDescription(`No results found for ${suffix}.`);

        msg.channel.send({embed});
      } catch(e) { u.alertError(e, msg); }
    }
  }
})
.setInit(() => {
  const nu = require("utils");

  dict = new CollegiateDictionary(Module.config.api.mw.dictionary);

  oxford = new Oxford(Module.api.oxford.id, Module.api.oxford.key);
  oxford.lookup = nu.promisify(oxford.find);
});

module.exports = Module;
