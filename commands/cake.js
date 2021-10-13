const Augur = require("augurbot"),
  moment = require("moment"),
  u = require("../utils/utils");

function celebrate() {
  if (moment().hours() == 15) {
    testBirthdays().catch(error => u.errorHandler(error, "Test Birthdays"));
    testCakeDays().catch(error => u.errorHandler(error, "Test Cake Days"));
  }
}

async function testBirthdays() {
  try {
    const ldsg = Module.client.guilds.cache.get(Module.config.ldsg);
    const curDate = moment();

    // Birthday Blast
    const birthdayLangs = require("../data/birthday.json");
    const flair = [
      ":tada: ",
      ":confetti_ball: ",
      ":birthday: ",
      ":gift: ",
      ":cake: "
    ];

    let birthdays = (await Module.db.ign.getList("birthday")).filter(ign => ldsg.members.cache.has(ign.discordId));
    for (let birthday of birthdays) {
      try {
        let date = moment(birthday.ign);
        if (date && date.month() == curDate.month() && date.date() == curDate.date()) {
          let member = ldsg.members.cache.get(birthday.discordId);
          await ldsg.channels.cache.get(Module.config.ldsg).send(`:birthday: :confetti_ball: :tada: Happy Birthday, ${member}! :tada: :confetti_ball: :birthday:`);
          let msgs = birthdayLangs.map(lang => member.send(u.rand(flair) + " " + lang));
          Promise.all(msgs).then(() => {
            member.send(":birthday: :confetti_ball: :tada: A very happy birthday to you, from LDS Gamers! :tada: :confetti_ball: :birthday:").catch(u.noop);
          }).catch(u.noop);
        }
      } catch (e) { u.errorHandler(error, "Birthay Send"); continue; }
    }
  } catch(e) { u.errorHandler(e, "Birthday Error"); }
}

async function testCakeDays() {
  try {
    const ldsg = Module.client.guilds.cache.get(Module.config.ldsg);
    const curDate = moment();

    // LDSG Cake Day

    const members = await ldsg.members.fetch();
    let offsets = await Module.db.user.getUsers({discordId: {$in: members.keyArray()}, priorTenure: { $gt: 0 }});

    for (let [key, member] of members.filter(m => m.roles.cache.has(Module.config.roles.trusted))) {
      const tenure = [
        "375047444599275543", // 1
        "375047691253579787", // 2
        "375047792487432192", // 3
        "543065980096741386", // 4
        "731895666577506345", // 5
        "889293324236767232", // 6
        "888619939177562113", // 7
        "889302270091620402", // 8
        "889293537810710578", // 9
        "889302389222428684", // 10
      ];
      try {
        let offset = offsets.find(o => o.discordId == key);
        let join = moment(member.joinedAt).subtract(offset?.priorTenure || 0, "days");
        if ((join?.month() == curDate.month()) && (join?.date() == curDate.date()) && (join?.year() < curDate.year())) {
          let years = curDate.year() - join.year();
          let thisYear = tenure[years - 1];
          await member.roles.remove(tenure).catch(u.noop);
          await member.roles.add(thisYear).catch(u.noop);
          try {
            if (member.roles.cache.has(Module.config.roles.trusted)) {
              ldsg.channels.cache.get(Module.config.ldsg).send(`${member} has been part of the server for ${years} ${(years > 1 ? "years" : "year")}! Glad you're with us!`);
            }
          } catch (e) { u.errorHandler(e, "Announce Cake Day Error"); continue; }
        }
      } catch(e) { u.errorHandler(e, "Fetch Cake Day Error"); }
    }
  } catch(error) { u.errorHandler(error, "Cake Day Error"); }
}

const Module = new Augur.Module()
.addCommand({name: "birthday",
  description: "It's your birthday!?",
  syntax: "<@user>", hidden: true,
  category: "Silly",
  process: async (msg) => {
    if (msg.mentions.members && msg.mentions.members.size > 0) {
      let flair = [
        ":tada: ",
        ":confetti_ball: ",
        ":birthday: ",
        ":gift: ",
        ":cake: "
      ];
      for (let [id, member] of msg.mentions.members) {
        try {
          await msg.client.channels.cache.get(Module.config.ldsg).send(`:birthday: :confetti_ball: :tada: Happy Birthday, ${member}! :tada: :confetti_ball: :birthday:`);
          let birthdayLangs = require("../data/birthday.json");
          let msgs = birthdayLangs.map(lang => member.send(u.rand(flair) + " " + lang));
          await Promise.all(msgs).catch(u.noop);
          member.send(":birthday: :confetti_ball: :tada: A very happy birthday to you, from LDS Gamers! :tada: :confetti_ball: :birthday:").catch(u.noop);
        } catch(error) { u.errorHandler(error, msg); }
      }
    } else {
      msg.reply("you need to tell me who to celebrate!");
    }
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addEvent("ready", celebrate)
.setClockwork(() => {
  try {
    return setInterval(celebrate, 60 * 60 * 1000);
  } catch(e) { u.errorHandler(e, "Birthday Clockwork Error"); }
});

module.exports = Module;
