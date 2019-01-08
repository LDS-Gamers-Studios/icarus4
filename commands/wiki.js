const Augur = require("augurbot"),
  cheerio = require("cheerio"),
  profanityFilter = require("profanity-matcher"),
  request = require("request-promise-native"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "wiki",
  description: "Search Wikipedia for a term.",
  syntax: "Term",
  permissions: (msg) => (!msg.guild || (msg.channel.permissionsFor(msg.member).has(["EMBED_LINKS", "ATTACH_FILES"]) && msg.channel.permissionsFor(msg.client.user).has("ATTACH_FILES"))),
  process: async (msg, suffix) => {
    try {
      const pf = new profanityFilter();
      if (pf.scan(suffix.toLowerCase()).length == 0) {
        let wiki = JSON.parse(await request(`https://en.wikipedia.org/w/api.php?action=opensearch&format=json&redirects=resolve&search=${encodeURIComponent(suffix)}`));

        if (wiki && wiki[1].length > 0) {
          let embed = u.embed()
          .setTitle(wiki[1][0])
          .setDescription(wiki[2][0])
          .setURL(wiki[3][0])
          .setAuthor("Wikipedia", "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/103px-Wikipedia-logo-v2.svg.png");

          if (wiki[2][0].endsWith("may refer to:")) {
            for (let i = 1; i < wiki[1].length; i++) {
              embed.addField(`[${wiki[1][i]}](${wiki[3][i]})`, wiki[2][i]);
            }
          } else {
            let body = await request(wiki[3][0]);
            let $ = cheerio.load(body);

            let img = $("table.infobox img");
            if (img.length > 0) {
              embed.setThumbnail("https:" + img.first().attr("src"));
            }
          }
          msg.channel.send(embed);
        } else {
          msg.reply(`I couldn't find a result for \`${suffix}\` on <https://en.wikipedia.org>.`);
        }
      } else msg.reply("I'm not going to search for that. :rolling_eyes:").then(u.clean);
    } catch(e) { u.errorLog(e, msg); }
  }
});

module.exports = Module;
