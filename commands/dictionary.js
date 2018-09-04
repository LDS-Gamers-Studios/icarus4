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
              let entry = xml.entry_list.entry[0];
              let defs = entry.def[0].dt;
              if (defs.length > 0) {
                let description = `**${entry.ew}** *(${entry.fl})*\n\`${entry.hw}\` | \`${entry.pr}\`\n`;

                defs.forEach((def, i) => description += `\n**${i + 1}**${(typeof def == "object" ? def._.replace("  ", ` ${def.d_link} `) : def)}`);

                let embed = u.embed()
                  .setTitle(entry.ew)
                  .setDescription(description)
                  .setColor([38, 120, 206])
                  .setThumbnail("https://www.dictionaryapi.com/images/info/branding-guidelines/mw-logo-dark-background-100x100.png")
                  .setFooter("Provided by Merriam-Webster's Collegiate® Dictionary");

                msg.channel.send(embed);
              }
            }
          });
        } else u.alertError(error, msg);
      });
    }
  }
});

module.exports = Module;
