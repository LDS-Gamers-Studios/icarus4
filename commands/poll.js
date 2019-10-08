const Augur = require("augurbot"),
  request = require("request"),
  u = require("../utils/utils"),
  chars = require("../utils/emojiCharacters");

const Module = new Augur.Module()
.addCommand({name: "poll",
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
})
.addCommand({name: "seed",
  description: "Seed your most recent post for a poll.",
  syntax: "abc.../123...",
  process: async (msg, suffix) => {
    try {
      const poll = (await msg.channel.fetchMessages()).filter(m => (m.author.id == msg.author.id) && (m.id != msg.id)).first();
      const options = suffix.toLowerCase().replace(/[^0-9a-z]/g, "");
      for (let i = 0; i < Math.min(options.length, 20); i++) {
        const opt = chars[options[i]];
        if (opt) await poll.react(opt);
      }
    } catch(e) { u.alertError(e, msg); }
  },
  permissions: (msg) => msg.guild && msg.channel.permissionsFor(msg.client.user).has("ADD_REACTIONS")
});

module.exports = Module;
