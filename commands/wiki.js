const Augur = require("augurbot"),
  u = require("../utils/utils"),
  axios = require('axios');

function getPage(page) {
  return new Promise((fulfill, reject) => {
    let url = "https://wiki.ldsgamers.com/api/" + encodeURIComponent(page);
    let token = Module.config.api.wiki;
    axios.request({
      url,
      method: "get",
      headers: { "Authorization": `Token ${token.tokenId}:${token.tokenSecret}` }
    }).then(fulfill, reject);
  });
}

function levenshteinDistance(s = "", t = "") {
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  return Math.min(
    levenshteinDistance(s.substr(1), t) + 1,
    levenshteinDistance(t.substr(1), s) + 1,
    levenshteinDistance(s.substr(1), t.substr(1)) + (s[0] !== t[0] ? 1 : 0)
  ) + 1;
}

const Module = new Augur.Module()
.addCommand({
  name: "wiki",
  description: "Search the LDSG Wiki for a term.",
  syntax: "Term",
  process: async (msg, suffix) => {
    let items = (await getPage("shelves").catch((err) => { return { data: [] }; })).data
      .concat((await getPage("books").catch((err) => { return { data: [] }; })).data);

    // There are already more than 3 items, so if it's less than 3 something is broken
    if (items.length < 3) {
      msg.reply("I was unable to see the wiki properly.").then(u.clean);
      return;
    }

    items = items.sort((a, b) => {
      let aDistance = levenshteinDistance(a.name, suffix);
      let bDistance = levenshteinDistance(b.name, suffix);
      return aDistance > bDistance ? 1 : -1;
    }).splice(0, 3).map(item => ({name: item.name, value: item.description}));
    // Note to add a link once we have a good way to *get* one.

    let embed = u.embed()
      .setTitle("Search results for `" + suffix + "`")
      .addFields(items);
    msg.channel.send({ embed });
  }
});

module.exports = Module;
