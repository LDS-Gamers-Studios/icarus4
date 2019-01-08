const Augur = require("augurbot"),
  request = require("request-promise-native"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "wiki",
  process: async (msg, suffix) => {
    try {
      let wiki = JSON.parse(await request(`https://en.wikipedia.org/w/api.php?action=opensearch&format=json&redirects=resolve&search=${encodeURIComponent(suffix)}`));

      if (wiki && wiki[1].length > 0) {
        let embed = u.embed()
        .setTitle(wiki[1][0])
        .setDescription(wiki[2][0])
        .setURL(wiki[3][0])
        .setThumbnail("https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/103px-Wikipedia-logo-v2.svg.png");

        if (wiki[2][0].endsWith("may refer to:")) {
          for (let i = 1; i < wiki[1].length; i++) {
            embed.addField(`[${wiki[1][i]}](${wiki[3][i]})`, wiki[2][i]);
          }
        }
        msg.channel.send(embed);
      } else {
        msg.reply(`I couldn't find a result for \`${suffix}\` on <https://en.wikipedia.org>.`);
      }
    } catch(e) { u.errorLog(e, msg); }
  }
});

module.exports = Module;
