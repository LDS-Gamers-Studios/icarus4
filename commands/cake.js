const Augur = require("augurbot"),
  u = require("../utils/utils");

async function testBirthdays() {
  try {
    let bot = Module.client;
    let curDate = new Date();
    let ldsg = bot.guilds.cache.get(Module.config.ldsg);
    if (curDate.getHours() == 15) {
      // Birthday Blast
      let birthdays = (await Module.db.ign.getList("birthday")).filter(ign => ldsg.members.cache.has(ign.discordId));
      for (let birthday of birthdays) {
        let date = new Date(birthday.ign);
        if (date && date.getMonth() == curDate.getMonth() && date.getDate() == curDate.getDate()) {
          let flair = [
            ":tada: ",
            ":confetti_ball: ",
            ":birthday: ",
            ":gift: ",
            ":cake: "
          ];
          try {
            let member = ldsg.members.cache.get(birthday.discordId);
            await ldsg.channels.cache.get(Module.config.ldsg).send(`:birthday: :confetti_ball: :tada: Happy Birthday, ${member}! :tada: :confetti_ball: :birthday:`);
            const birthdayLangs = require("../data/birthday.json");
            let msgs = birthdayLangs.map(lang => member.send(u.rand(flair) + " " + lang));
            Promise.all(msgs).then(() => {
              member.send(":birthday: :confetti_ball: :tada: A very happy birthday to you, from LDS Gamers! :tada: :confetti_ball: :birthday:").catch(u.noop);
            }).catch(u.noop);
          } catch (e) { u.errorHandler(error, "Birthay Send"); continue; }
        }
      }

      // LDSG Cake Day
      let tenure = [
        "375047444599275543",
        "375047691253579787",
        "375047792487432192",
        "543065980096741386",
        "731895666577506345"
      ];

      let members = await ldsg.members.fetch();
      let apicall = 1;
      for (let [key, member] of members) {
        try {
          let join = member.joinedAt;
          if (join && (join.getMonth() == curDate.getMonth()) && (join.getDate() == curDate.getDate()) && (join.getFullYear() < curDate.getFullYear())) {
            let years = curDate.getFullYear() - join.getFullYear();
            try {
              await member.roles.add(tenure[years - 1]).catch(u.noop);
            } catch(error) { u.errorHandler(error, `Apply cake day roles: ${member.displayName}`); }
            try {
              let user = await Module.db.user.fetchUser(member.id);
              if (user.posts > 0) {
                ldsg.channels.cache.get(Module.config.ldsg).send(`${member} has been part of the server for ${years} ${(years > 1 ? "years" : "year")}! Glad you're with us!`);
              }
            } catch (e) { u.errorHandler(e, "Announce Cake Day Error"); continue; }
          }
        } catch(e) { u.errorHandler(e, "Fetch Cake Day Error"); }
      }
    }
  } catch(e) { u.errorHandler(e, "Cake Day Error"); }
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
.addEvent("ready", testBirthdays)
.setClockwork(() => {
  try {
    let bot = Module.client;
    return setInterval(testBirthdays, 60 * 60 * 1000, bot);
  } catch(e) { u.errorHandler(e, "Birthday Clockwork Error"); }
});

module.exports = Module;
