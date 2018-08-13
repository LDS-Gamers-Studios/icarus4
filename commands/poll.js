const Augur = require("augurbot"),
  request = require("request"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "quote",
  description: "Create a StrawPoll.me poll",
  syntax: "<Title> | <Option 1> | <Option 2>",
  process: (msg, suffix) => {
    let options = suffix.split("|").map(o => o.trim());
    let title = options.shift();
    if (!title || options.length < 2 || options.length > 30) {
      msg.reply("You need a title and at least two options!").then(u.clean);
    } else {
      request({
        url: "https://www.strawpoll.me/api/v2/polls",
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          title: title,
          options: options,
          multi: true,
          dupcheck: "normal",
          captcha: true
        })
      }, (err, response, body) => {
        if (err) {
          console.error("ERROR", err);
        } else {
          body = JSON.parse(body);
          let embed = u.embed();
          embed
            .setAuthor("New poll from " + msg.author.username)
            .setTimestamp()
            .setTitle(decodeURI(body.title))
            .setURL(`https://www.strawpoll.me/${body.id}`)
            .setDescription("Vote now!\n" + body.options.map(o => "· " + decodeURI(o)).join("\n"));
          msg.channel.send(embed);
        }
      });
    }
  }
});

module.exports = Module;
