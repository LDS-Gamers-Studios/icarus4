const Augur = require("augurbot");
const u = require("../utils/utils");
const shortid = require("shortid").generate;
const fs = require("fs");
const auctionboard = "209046676781006849";

class Auction {
  constructor(data) {
    this.id = data.id || shortid();
    this.bids = data.bids || [];
    this.description = data.description;
    this.currency = data.currency;
    this.messageId = data.messageId;
    this.complete = data.complete;
  }

  bid(user, bid) {
    if (typeof bid == "string") bid = parseInt(bid, 10);
    if (bid > this.highbid.bid) {
      let record = {user: (user.id || user), bid};
      this.bids.push(record);
      return record;
    } else return false;
  }

  get embed() {
    let high = this.highbid;
    return u.embed()
      .setDescription((this.complete ? "__**AUCTION COMPLETE**__\n" : "") + this.description)
      .addField("Currency", this.currency, true)
      .addField("High Bid", `<@${high.user}>: ${high.bid}`, true)
      .setFooter(this.id);
  }

  get highbid() {
    return this.bids.sort((a, b) => b.bid - a.bid)[0];
  }

  setMessage(msg) {
    this.messageId = msg.id || msg;
    return this;
  }

  toObject() {
    return {
      id: this.id,
      bids: this.bids,
      description: this.description,
      currency: this.currency,
      messageId: this.messageId,
      complete: this.complete
    };
  }
}

const auctions = new u.Collection();

function saveAuctions() {
  try {
    fs.writeFileSync("./data/auctions.json", JSON.stringify(Array.from(auctions.values())));
  } catch(error) { u.errorHandler(error, "Write Auctions Data"); }
}

const Module = new Augur.Module()
.addCommand({name: "auctionstart",
  description: "Start an Auction",
  syntax: "Currency Reserve Description",
  permissions: (msg) => msg.guild && msg.member.roles.cache.has(Module.config.roles.management),
  process: async (msg, suffix) => {
    try {
      let pattern = /(\w+) (?:\w+)?(\d+) (.*)/;
      let match = pattern.exec(suffix);
      if (match) {
        let currency = pattern[1];
        let reserve = parseInt(pattern[3], 10);
        let description = pattern[4];
        let auction = new Auction({
          bids: [{user: msg.author.id, bid: reserve}],
          description,
          currency
        });
        let m = await msg.guild.channels.cache.get(auctionboard).send({embed: auction.embed});
        auction.setMessage(m);
        auctions.set(auction.id, auction);
        saveAuctions();
      } else {
        msg.reply("You need to use `Currency Reserve Description` format, e.g. `$ 20 My old cat`.");
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "auctionstop",
  description: "Stop an Auction",
  syntax: "AuctionId",
  permissions: (msg) => msg.guild && msg.member.roles.cache.has(Module.config.roles.management),
  process: async (msg, suffix) => {
    try {
      if (auctions.has(suffix)) {
        let auction = auctions.get(suffix);
        auction.complete = true;
        let post = await msg.guild.channels.cache.get(auctionboard).messages.fetch(auction.messageId);
        await post.edit({embed: auction.embed});
        saveAuctions();
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.addCommand({name: "bid",
  description: "Buid on an active Auction",
  syntax: "AuctionId Bid",
  permissions: (msg) => msg.guild && msg.guild.id == Module.config.ldsg,
  process: async (msg, suffix) => {
    try {
      u.clean(msg);
      let params = suffix.split(" ");
      if (params.length == 2) {
        let bid = parseInt(params[1], 10);
        let auction = auctions.get(params[0]);
        if (auction && !auction.complete && bid) {
          let high = auctions.highbid;
          let success = auctions.get(params[0]).bid(msg.author, bid);
          if (success) {
            msg.reply("your bid has been entered!").then(u.clean);
            msg.client.users.cache.get(high.user).send(`You've been outbid in Auction ${auction.id} by ${msg.member.displayName}!`).catch(u.noop);
            saveAuctions();
          } else msg.reply("your bid was unsuccessful.").then(u.clean);
        } else {
          msg.reply("you need to tell me an active auction id and bid amount.");
        }
      } else {
        msg.reply("you need to tell me an auction id and bid amount.");
      }
    } catch(error) { u.errorHandler(error, msg); }
  }
})
.setInit(() => {
  if (!fs.existsSync("./data/auctions.json")) {
    fs.writeFileSync("./data/auctions.json", "[]");
  } else {
    let data = JSON.parse(fs.readFileSync("./data/auctions.json", "utf8"));
    for (const auction of data) {
      if (!auction.complete) auctions.set(auction.id, new Auction(auction));
    }
  }
});

module.exports = Module;
