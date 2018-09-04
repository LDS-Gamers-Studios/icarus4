const Augur = require("augurbot"),
  parseXML = require("xml2js").parseString,
  u = require("../utils/utils"),
  request = require("request");

const Module = new Augur.Module()
.addCommand({name: "define",
  description: "Define a word",
  syntax: "<word>",
  alisases: ["dictionary"],
  process: (msg, suffix) => {
    if (!suffix) msg.reply("you need to give me a word to define!");
    else {
      let url = "https://www.dictionaryapi.com/api/v1/references/collegiate/xml/" + encodeURIComponent(suffix) + "?key=" + Module.config.api.mw.dictionary;
      request(url, (error, response, body) => {
        if (!error && response && response.statusCode == 200) {
          parseXML(body, (err, xml) => {
            if (err) u.alertError(err, msg);
            else {
              let entries = xml.entry_list.entry.filter(e => e.ew && stringify(e.ew).toLowerCase() == suffix.toLowerCase());
              let description = "";
              let embed = u.embed()
                .setColor([38, 120, 206])
                .setThumbnail("https://www.dictionaryapi.com/images/info/branding-guidelines/mw-logo-dark-background-100x100.png")
                .setFooter("Provided by Merriam-Webster's Collegiate® Dictionary");

              entries.forEach(entry => {
                let defs = entry.def[0].dt;
                if (defs.length > 0) {
                  let info = [];
                  ["hw", "pr"].forEach(e => { if (entry[e]) info.push(entry[e][0]); });

                  description += `\n\n**${stringify(entry.ew)}** *(${entry.fl})*\n` + info.map(i => `\`${stringify(i)}\``).join(" | ") + "\n";
                  defs.forEach((def, i) => description += `\n**${i + 1}**${stringify(def)}`);
                }
              });

              embed.setDescription(description.trim().slice(0, 2000));
              msg.channel.send(embed);
            }
          });
        } else u.alertError(error, msg);
      });
    }
  }
});

module.exports = Module;
