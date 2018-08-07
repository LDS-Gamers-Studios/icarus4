const Augur = require("augurbot"),
  request = require("request"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "quote",
  description: "Random Quote",
  process: (msg) => {
    request("https://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en", (error, response, body) => {
      if (error || response.statusCode != 200) msg.reply("sorry, I ran into an error").then(u.clean);
      else {
        let quote = JSON.parse(body.replace(/\\'/g, "'"));
        msg.channel.send("```" + quote.quoteText + "\n  - " + quote.quoteAuthor + "```");
      }
    });
  }
});

module.exports = Module;
