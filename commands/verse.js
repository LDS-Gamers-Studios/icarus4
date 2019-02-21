const Augur = require("augurbot");

const scriptureTest = /([\w &]+) ((\d+)(\s?:\s?(\d+)\s?(-\s?\d+)?)?)/i,
	alias = {},
	books = {},
	works = {
		ot: "old-testament",
		nt: "new-testament",
		bofm: "book-of-mormon",
		"dc-testament": "doctrine-and-covenants",
		pgp: "pearl-of-great-price"
	},
	u = require("../utils/utils"),
	request = require("request"),
	cheerio = require("cheerio");

const searchKeys = [];

function nb(title, abbr, work, aliases = []) {
	if (!Array.isArray(aliases))
		aliases = [aliases.toLowerCase()];

	abbr = abbr.toLowerCase().replace(/ /g, "-");

	books[abbr] = {
		title: title,
		work: work
	}

	if (title.toLowerCase().replace(/ /g, "-") != abbr)
		aliases.push(title);

	if (aliases.length > 0) {
		aliases.forEach(a => {
			alias[a.toLowerCase().replace(/ /g, "-")] = abbr;
      searchKeys.push(a.toLowerCase());
		});
	}
  searchKeys.push(abbr.toLowerCase());
}

function getRandomScriptureMastery() {
	let scriptureMastery = require("../data/scripture-mastery.json");
	let entryNumber = Math.floor(Math.random() * 100);
	let verse = scriptureMastery["list"][entryNumber];
	return parseScripture(verse);
}

function parseScripture(string) {
	if (string.indexOf(":") == -1)
		string += ":0";

	var info = scriptureTest.exec(string);
	/* 1 - book, 3 - Chapter, 4 - Verse expansion, 5 - Starting Verse */

	let response = (info ? {
		book: info[1],
		chapter: info[3],
		verse: ((!info[4] || (info[4] == ":0")) ? null : info[4].replace(/(:|\s)/g, "")),
		start: ((!info[4] || (info[4] == ":0")) ? null : info[5])
	} : null);

	if (response && response.verse) {
		response.book = response.book.replace(/ /g, "-").toLowerCase();
		if (alias[response.book]) response.book = alias[response.book];
		if (books[response.book]) {
			let fullText = require(`../data/${works[books[response.book].work]}-reference.json`);
			let range = response.verse.split("-").map(v => parseInt(v, 10));

			if (fullText[books[response.book].title] && fullText[books[response.book].title][response.chapter]) {
				response.text = [];
				if (range.length > 1) {
					for (var v = Math.min(...range); v <= Math.max(...range); v++) {
						if (fullText[books[response.book].title][response.chapter][v.toString()])
							response.text.push(`${v}  ` + fullText[books[response.book].title][response.chapter][v.toString()]);
					}
				} else {
					if (fullText[books[response.book].title][response.chapter][response.verse.toString()])
						response.text.push(`${response.verse}  ` + fullText[books[response.book].title][response.chapter][response.verse.toString()]);
				}
				response.text = response.text.join("\n\n");
			}
		}
	}

	return response;
}

nb("Genesis", "gen", "ot");
nb("Exodus", "ex", "ot");
nb("Leviticus", "lev", "ot");
nb("Numbers", "num", "ot");
nb("Deuteronomy", "deut", "ot");
nb("Joshua", "josh", "ot");
nb("Judges", "judg", "ot");
nb("Ruth", "ruth", "ot");
nb("1 Samuel", "1 sam", "ot", "1sam");
nb("2 Samuel", "2 sam", "ot", "2sam");
nb("1 Kings", "1 kgs", "ot", "1kgs");
nb("2 Kings", "2 kgs", "ot", "2kgs");
nb("1 Chronicles", "1 chr", "ot", "1chr");
nb("2 Chronicles", "2 chr", "ot", "2chr");
nb("Ezra", "ezra", "ot");
nb("Nehemiah", "neh", "ot");
nb("Esther", "esth", "ot");
nb("Job", "job", "ot");
nb("Psalms", "ps", "ot", "psalm");
nb("Proverbs", "prov", "ot");
nb("Ecclesiastes", "eccl", "ot");
nb("Song of Solomon", "song", "ot", "sos");
nb("Isaiah", "isa", "ot");
nb("Jeremiah", "jer", "ot");
nb("Lamentations", "lam", "ot");
nb("Ezekiel", "ezek", "ot");
nb("Daniel", "dan", "ot");
nb("Hosea", "hosea", "ot");
nb("Joel", "joel", "ot");
nb("Amos", "amos", "ot");
nb("Obadiah", "obad", "ot");
nb("Jonah", "jonah", "ot");
nb("Micah", "micah", "ot");
nb("Nahum", "nahum", "ot");
nb("Habakkuk", "hab", "ot");
nb("Zephaniah", "zeph", "ot");
nb("Haggai", "hag", "ot");
nb("Zechariah", "zech", "ot");
nb("Malachi", "mal", "ot");

nb("Matthew", "matt", "nt");
nb("Mark", "mark", "nt");
nb("Luke", "luke", "nt");
nb("John", "john", "nt");
nb("Acts", "acts", "nt");
nb("Romans", "rom", "nt");
nb("1 Corinthians", "1 cor", "nt", "1cor");
nb("2 Corinthians", "2 cor", "nt", "2cor");
nb("Galatians", "gal", "nt");
nb("Ephesians", "eph", "nt");
nb("Philippians", "philip", "nt");
nb("Colossians", "col", "nt");
nb("1 Thessalonians", "1 thes", "nt", "1thes");
nb("2 Thessalonians", "2 thes", "nt", "2thes");
nb("1 Timothy", "1 tim", "nt", "1tim");
nb("2 Timothy", "2 tim", "nt", "2tim");
nb("Titus", "titus", "nt");
nb("Philemon", "philem", "nt");
nb("Hebrews", "heb", "nt");
nb("James", "james", "nt");
nb("1 Peter", "1 pet", "nt", "1pet");
nb("2 Peter", "2 pet", "nt", "2pet");
nb("1 John", "1 jn", "nt", ["1jn", "1john"]);
nb("2 John", "2 jn", "nt", ["2jn", "2john"]);
nb("3 John", "3 jn", "nt", ["3jn", "3john"]);
nb("Jude", "jude", "nt");
nb("Revelation", "rev", "nt", "revel")

nb("1 Nephi", "1 ne", "bofm", "1ne");
nb("2 Nephi", "2 ne", "bofm", "2ne");
nb("Jacob", "jacob", "bofm", "jac");
nb("Enos", "enos", "bofm");
nb("Jarom", "jarom", "bofm");
nb("Omni", "omni", "bofm");
nb("Words of Mormon", "w of m", "bofm", "wom");
nb("Mosiah", "mosiah", "bofm");
nb("Alma", "alma", "bofm");
nb("Helaman", "hel", "bofm");
nb("3 Nephi", "3 ne", "bofm");
nb("4 Nephi", "4 ne", "bofm");
nb("Mormon", "morm", "bofm");
nb("Ether", "ether", "bofm");
nb("Moroni", "moro", "bofm");

nb("Doctrine & Covenants", "dc", "dc-testament", ["d&c", "d & c"]);

nb("Moses", "moses", "pgp");
nb("Abraham", "abr", "pgp");
nb("Joseph Smith - Matthew", "js m", "pgp", ["jsm", "joseph smith matthew"]);
nb("Joseph Smith - History", "js h", "pgp", ["jsh", "joseph smith history"]);
nb("Articles of Faith", "a of f", "pgp", "aof");

const searchExp = new RegExp(`\\b(${searchKeys.join("|")})\\s*(\\d+)\\s?:\\s?(\\d+)(-\\s?\\d+)?`, "ig");

const Module = new Augur.Module()
.addCommand({name: "verse",
  description: "Link to a chapter or verse in the standard works",
  syntax: "Scripture Reference (John 10:11)",
  info: "Links to and highlights a scripture on LDS.org",
  aliases: ["sw", "v"],
  category: "Gospel",
  process: (msg, suffix) => {
  	if (suffix == "random" || suffix == "rand" || suffix == "r")
  	  suffix = getRandomScriptureMastery();
  	if (suffix) {
      let scripture = parseScripture(suffix.replace(".", ""));
      if (scripture) {
        scripture.book = scripture.book.replace(/ /g, "-").toLowerCase();
        if (alias[scripture.book]) scripture.book = alias[scripture.book];
        if (books[scripture.book]) {
          let link = `https://www.lds.org/scriptures/${books[scripture.book].work}/${scripture.book}/${scripture.chapter}${(scripture.verse ? ("." + scripture.verse + "?lang=eng#p" + scripture.start) : "?lang=eng")}`;
					if (scripture.text) {
						let embed = u.embed()
						.setTitle(`${books[scripture.book].title} ${scripture.chapter}${(scripture.verse ? (":" + scripture.verse) : "")}`)
						.setColor(0x012b57)
						.setURL(link)
						.setDescription((scripture.text.length > 2048 ? scripture.text.slice(0, 2000) + "..." : scripture.text));
						msg.channel.send(embed);
					} else msg.channel.send(`**${books[scripture.book].title} ${scripture.chapter}${(scripture.verse ? (":" + scripture.verse) : "")}**\n<${link}>`);
        } else msg.reply("sorry, I couldn't understand that reference.").then(u.clean);
      } else msg.reply("sorry, I couldn't understand that reference.").then(u.clean);
    } else msg.reply("you need to tell me which scripture to find!").then(u.clean);
  }
})
.addCommand({name: "conference",
  description: "Searches for the best matching conference talk.",
  syntax: "Search terms",
  aliases: ["conf"],
  category: "Gospel",
  process: (msg, suffix) => {
  	if (suffix) {
	    let url = `https://www.lds.org/search?lang=eng&collection=general-conference&query=${encodeURIComponent(suffix)}`;

	    request(url, (err, response, body) => {
	      if (err) {
	        console.error(err);
	      } else {
	        $ = cheerio.load(body);
	        let link = $("section.results a").first().attr("href");
	        if (link) msg.channel.send(link);
	        else msg.reply("I couldn't find any results for that.").then(u.clean);
	      }
	    });
	} else {
		msg.reply("you need to tell me what you want to search!");
	}
  }
})
.addEvent("message", (msg) => {
  if ((msg.channel.id == "114944876763807751") && !u.parse(msg)) {
    let match = null;
    while (match = searchExp.exec(msg.cleanContent))
      Module.handler.execute("verse", msg, match[0]);
  }
});

module.exports = Module;
