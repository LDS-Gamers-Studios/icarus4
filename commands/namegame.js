const Augur = require("augurbot");
const cheerio = require("cheerio");
const request = require("request-promise-native");
const u = require("../utils/utils");
const profanityFilter = require("profanity-matcher");

const Module = new Augur.Module()
.addCommand({name: "namegame",
  category: "Fun",
  syntax: "[Name] (One word only)",
  description: "Play the Name Game!",
  process: async (msg, suffix) => {
    try {
      if (msg.mentions.members && msg.mentions.members.size > 0) suffix = msg.mentions.members.first().displayName;
      else if (msg.mentions.users.size > 0) suffix = msg.mentions.users.first().displayName;

      let name = suffix.replace("-", " ").replace("_", " ").split(" ")[0];
      let body = await request(`https://thenamegame-generator.com/lyrics/${name}.html`).catch(u.noop);

      if (body) {
        const pf = new profanityFilter();

        let $ = cheerio.load(body);
        let results = $("blockquote").html().replace(/<br>/g, "\n");

        if ((pf.scan(results.toLowerCase().replace(/[\-\n]/g, " ").replace(/\s\s+/g, " ")).length == 0) && (name.length <= 230) && (results.length + name.length <= 5750)) {
          let embed = u.embed().setTitle(`🎶 **The Name Game! ${name}! 🎵`).setDescription(results);
          msg.channel.send({embed});
        } else {
          msg.react("😬").catch(u.noop);
        }
      } else {
        msg.react("❌").catch(u.noop);
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
});

module.exports = Module;
