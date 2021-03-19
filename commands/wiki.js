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

String.prototype.levenshtein = function (string) {
  var a = this, b = string + "", m = [], i, j, min = Math.min;

  if (!(a && b)) return (b || a).length;

  for (i = 0; i <= b.length; m[i] = [i++]);
  for (j = 0; j <= a.length; m[0][j] = j++);

  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      m[i][j] = b.charAt(i - 1) == a.charAt(j - 1)
        ? m[i - 1][j - 1]
        : m[i][j] = min(
          m[i - 1][j - 1] + 1,
          min(m[i][j - 1] + 1, m[i - 1][j]))
    }
  }

  return m[b.length][a.length];
}

String.prototype.removeWords = function (toRemove) {
  return this.split(/[\s,-_\n]+/).filter(f => !toRemove.includes(f)).join(' ');
}

const Module = new Augur.Module()
.addCommand({
  name: "wiki",
  description: "Search the LDSG Wiki for a term.",
  syntax: "Term",
  enabled: false,
  process: async (msg, suffix) => {
    msg.channel.startTyping();
    let shelves = (await getPage("shelves").catch(u.noop))?.data?.data || [];
    let books = (await getPage("books").catch(u.noop))?.data?.data || [];
    let items = shelves.concat(books);

    // There are already more than 3 items, so if it's less than 3 something is broken
    if (items.length < 3) {
      msg.reply("I was unable to see the wiki properly.").then(u.clean);
      msg.channel.stopTyping();
      return;
    }

    function getUrl(item) {
      // Checking if it's a shelf or a book
      if (shelves.find(s => s.name === item.name)) {
        return "https://wiki.ldsgamers.com/shelves/" + item.slug;
      }
      return "https://wiki.ldsgamers.com/books/" + item.slug;
    }

    let toRemove = ["a", "of", "an", "and"];

    items = items.filter(i => i.name.removeWords(toRemove).levenshtein(suffix) < 6).sort((a, b) => {
      let aDistance = a.name.removeWords(toRemove).levenshtein(suffix);
      let bDistance = b.name.removeWords(toRemove).levenshtein(suffix);
      return aDistance > bDistance ? 1 : -1;
    }).map(item => ({ name: item.name, value: `[${item.description}](${getUrl(item)})\nUpdated at ${item.updated_at}` }));
    if (items.length > 3) {
      items = items.slice(3);
    }
    else if (items.length === 0) {
      msg.reply("I couldn't find any books or shelves that matched that.").then(u.clean);
      msg.channel.stopTyping();
      return;
    }

    let embed = u.embed()
      .setTitle("Search results for `" + suffix + "`")
      .addFields(items);
    msg.channel.send({ embed });
    msg.channel.stopTyping();
  }
});

module.exports = Module;
