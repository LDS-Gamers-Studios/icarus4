const Augur = require("augurbot"),
  u = require("../utils/utils"),
  {CollegiateDictionary, WordNotFoundError} = require("mw-dict");

var dict;

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
.setInit(() => {
  dict = new CollegiateDictionary(Module.config.api.mw.dictionary);
});

module.exports = Module;
