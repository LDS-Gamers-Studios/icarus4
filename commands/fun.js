const Augur = require("augurbot"),
  u = require("../utils/utils");
const emoji = require('../utils/emojiCharacters.js');

function quickFile(msg, file, name = null, showName = true) {
  if (Array.isArray(file))
    file = u.rand(file);

  msg.delete().catch(console.error);
  msg.channel.send(
    (showName ? ((msg.member ? msg.member.displayName : msg.author.username) + " right now:") : ""),
    { files: [
      (name ? {attachment: file, name: name} : file)
    ]}
  ).catch(console.error);
}

function quickText(msg, text) {
  msg.delete().catch(u.errorHandler);
  msg.channel.send(text).catch(u.errorHandler);
}

async function testBirthdays(bot) {
  try {
    let curDate = new Date();
    let ldsg = Module.config.ldsg;
    if (curDate.getHours() == 20) {
      // Birthday Blast
      let birthdays = (await Module.db.ign.getList("birthday")).filter(ign => bot.guilds.cache.get(ldsg).members.cache.has(ign.discordId));
      for (let b = 0; b < birthdays.length; b++) {
        let birthday = birthdays[b];
        let date = new Date(birthday.ign);
        if (date.getMonth() == curDate.getMonth() && date.getDate() == curDate.getDate()) {
          let flair = [
            ":tada: ",
            ":confetti_ball: ",
            ":birthday: ",
            ":gift: ",
            ":cake: "
          ];
          try {
            let member = await bot.guilds.cache.get(ldsg).fetchMember(birthday.discordId);
            await bot.channels.cache.get(ldsg).send(":birthday: :confetti_ball: :tada: Happy Birthday, " + member + "! :tada: :confetti_ball: :birthday:");
            const birthdayLangs = require("../data/birthday.json");
            let msgs = birthdayLangs.map(lang => member.send(u.rand(flair) + " " + lang));
            Promise.all(msgs).then(() => {
              member.send(":birthday: :confetti_ball: :tada: A very happy birthday to you, from LDS Gamers! :tada: :confetti_ball: :birthday:").catch(u.noop);
            }).catch(u.noop);
          } catch (e) { continue; }
        }
      }

      // LDSG Cake Day
      let roles = [
        null,
        "375047444599275543",
        "375047691253579787",
        "375047792487432192",
        "543065980096741386",
        "731895666577506345"
      ];
      let members = bot.guilds.cache.get(ldsg).members.cache;
      let apicall = 0;
      for (let [key, member] of members) {
        try {
          let join = member.joinedAt;
          if (join && (join.getMonth() == curDate.getMonth()) && (join.getDate() == curDate.getDate()) && (join.getFullYear() < curDate.getFullYear())) {
            let years = curDate.getFullYear() - join.getFullYear();
            for (let i = 1; i <= years; i++) {
              if (i == years && !member.roles.cache.has(roles[i])) {
                setTimeout((member, role) => {
                  member.addRole(role);
                }, 1200 * apicall++, member, roles[i]);
              } else if (member.roles.cache.has(roles[i])) {
                setTimeout((member, role) => {
                  member.removeRole(role);
                }, 1200 * apicall++, member, roles[i]);
              }
            }
            // Announce if active
            try {
              let user = await Module.db.user.fetchUser(member.id);
              if (user.posts > 0) {
                bot.channels.cache.get(ldsg).send(`${member} has been part of the server for ${years} ${(years > 1 ? "years" : "year")}! Glad you're with us!`);
              }
            } catch (e) { u.errorHandler(e, "Announce Cake Day Error"); continue; }
          }
        } catch(e) { u.errorHandler(e, "Fetch Cake Day Error"); }
      }
    }
  } catch(e) { u.errorHandler(e, "Cake Day Error"); }
}

const Module = new Augur.Module()
.addCommand({name: "8ball",
  description: "Get an answer from the Magic 8-ball.",
  aliases: ["🎱"],
  category: "Silly",
  process: (msg, suffix) => {
    if (!suffix || !suffix.endsWith("?")) {
      msg.reply("you need to ask me a question, silly.").then(u.clean);
    } else {
      const outcomes = [
        "It is certain.",
        "It is decidedly so.",
        "Without a doubt.",
        "Yes - definitely.",
        "You may rely on it.",
        "As I see it, yes.",
        "Most likely.",
        "Outlook good.",
        "Yes.",
        "Signs point to yes.",
        // "Reply hazy, try again.",
        // "Ask again later.",
        // "Better not tell you now.",
        // "Cannot predict now.",
        // "Concentrate and ask again.",
        "Don't count on it.",
        "My reply is no.",
        "My sources say no.",
        "Outlook not so good.",
        "Very doubtful."
      ];
      msg.reply(u.rand(outcomes));
    }
  }
})
.addCommand({name: "acronym",
  description: "Get a random 3-5 letter acronym. For science.",
  aliases: ["word"],
  category: "Silly",
  process: (msg) => {
    let alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Y", "Z"];
    let len = Math.floor(Math.random() * 3) + 3;
    let profanityFilter = require("profanity-matcher");
    let pf = new profanityFilter();
    let word = [];

    while (word.length == 0) {
      for (var i = 0; i < len; i++) {
        word.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
      }
      word = word.join("");

      if (pf.scan(word.toLowerCase()).length == 0) {
        u.botSpam(msg).send("I've always wondered what __**" + word + "**__ stood for...");
      } else {
        word = [];
      }
    }
  },
})
.addCommand({name: "allthe",
  description: "ALL THE _____!",
  syntax: "something",
  category: "Silly",
  process: (msg, suffix) => {
    u.clean(msg, 0);
    if (suffix) msg.channel.send(`${(msg.member ? msg.member.displayName : msg.author.username)}:\nALL THE ${suffix.toUpperCase()}!`, {files: ["https://cdn.discordapp.com/emojis/250348426817044482.png"]});
  }
})
.addCommand({name: "birthday",
  description: "It's your birthday!?",
  syntax: "<@user>", hidden: true,
  category: "Silly",
  process: (msg) => {
    if (msg.mentions.members && msg.mentions.members.size > 0) {
      let flair = [
        ":tada: ",
        ":confetti_ball: ",
        ":birthday: ",
        ":gift: ",
        ":cake: "
      ];
      for (let [id, member] of msg.mentions.members) {
        msg.client.channels.cache.get(Module.config.ldsg).send(`:birthday: :confetti_ball: :tada: Happy Birthday, ${member}! :tada: :confetti_ball: :birthday:`).then(() => {
          let birthdayLangs = require("../data/birthday.json");
          let msgs = birthdayLangs.map(lang => birthday.send(u.rand(flair) + " " + lang));

          Promise.all(msgs).then(() => {
            birthday.send(":birthday: :confetti_ball: :tada: A very happy birthday to you, from LDS Gamers! :tada: :confetti_ball: :birthday:").catch(u.noop);
          }).catch(u.noop);
        });
      }
    } else {
      msg.reply("you need to tell me who to celebrate!");
    }
  },
  permissions: (msg) => Module.config.adminId.includes(msg.author.id)
})
.addCommand({name: "chaos",
  description: "IT'S MADNESS!",
  category: "Silly",
  process: (msg) => {
    quickFile(msg, "https://cdn.discordapp.com/attachments/96335850576556032/452153983931383808/FireGifLDSG.gif", "fire.gif");
  }
})
.addCommand({name: "disagree",
  description: "I'm not sure I agree...",
  category: "Silly",
  process: (msg) => {
    quickFile(msg, [
      "https://cdn.discordapp.com/attachments/136577505418018826/274593594256523284/2FNHWnX.png",
      "http://i.imgur.com/eBHIyVA.png"
    ], "disagree.png");
  }
})
.addCommand({name: "explosion",
  description: "Set an explosion",
  aliases: ["explode"],
  category: "Silly",
  process: (msg) => {
    quickText(msg, ":fire: :fire: :fire:");
  }
})
.addCommand({name: "fine",
  description: "You're fined.",
  syntax: "<@user>", hidden: true,
  category: "Silly",
  process: (msg) => {
    if (msg.mentions.users.size > 0) {
      for (const [id, member] of msg.mentions.members) {
        quickText(msg, `${member} You are fined one credit for a violation of the Verbal Morality Statute. Reason Code: 2DANK`);
      }
    } else {
      msg.reply("you need to let me know who to fine.").then(u.clean).catch(u.errorHandler);
    }
  },
  permissions: (msg) => (msg.guild && msg.member.roles.cache.has(Module.config.roles.mod))
})
.addCommand({name: "fire",
  description: "Light a fire",
  category: "Silly",
  process: (msg) => {
    quickText(msg, "*lights a small fire in the corner*\nNothing to see here, citizens. Return to your homes.");
  }
})
.addCommand({name: "guilty",
  description: "Guilty as charged",
  category: "Silly",
  process: (msg) => {
    quickFile(msg, "https://cdn.discordapp.com/attachments/228688325169512450/280196904279736320/ezgif.com-1f661bc6b6.gif", "guilty.gif");
  }
})
.addCommand({name: "happydance",
  description: "Happy Dance!",
  aliases: ["happy"],
  category: "Silly",
  process: (msg) => {
    quickFile(msg, [
      "https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif", // Carlton
      "https://media.giphy.com/media/DGSlkymXSnc4g/giphy.gif", // TGWTG
      "https://media.giphy.com/media/26AHwHFm6z7TffC2k/giphy.gif" // Erkel
    ], "happydance.gif");
  }
})
.addCommand({name: "handicorn",
  description: "HANDICORN BATTLE!",
  category: "Silly",
  process: (msg) => msg.channel.send("https://youtu.be/rlxHJsSsUGk")
})
.addCommand({name: "hbs",
  description: "Handicorn, Buttermelon, Sloth!",
  syntax: "handicorn | buttermelon | sloth",
  aliases: ["rps", "bhs", "sbh", "bsh", "hsb", "shb"],
  category: "Silly",
  process: (msg, suffix) => {
    let userPick = suffix.toLowerCase()[0];
    if (userPick && ["b", "h", "s"].includes(userPick)) {
      let icarusPick = u.rand(["b", "h", "s"]);
      let options = {
        "b": { emoji: "<:buttermelon:305039588014161921>", value: 0},
        "h": { emoji: "<:handicorn:305038099254083594>", value: 1},
        "s": { emoji: "<:sloth:305037088200327168>", value: 2}
      };

      let diff = options[icarusPick].value - options[userPick].value;
      let response = `You picked ${options[userPick].emoji}, I picked ${options[icarusPick].emoji}. `;

      if (diff == 0) {
        msg.reply(response + "It's a tie!"); // TIE
      } else if ((diff == -1) || (diff == 2)) {
        msg.reply(response + "I win!");
      } else {
        msg.reply(response + "You win!");
      }
    } else {
      msg.reply("you need to tell me what you pick: handicorn, buttermelon, or sloth!").then(u.clean);
    }
  }
})
.addCommand({name: "hug",
  description: "Send a much needed hug.",
  syntax: "<@user(s)>",
  info: "Sends someone a hug via direct message.",
  category: "Silly",
  permissions: msg => msg.guild,
  process: async (msg, suffix) => {
    u.clean(msg);
    if (msg.mentions.users.size > 0) {
      let hugs = [
        "http://24.media.tumblr.com/72f1025bdbc219e38ea4a491639a216b/tumblr_mo6jla4wPo1qe89guo1_1280.gif",
        "https://cdn.discordapp.com/attachments/96335850576556032/344202091776049152/hug.gif"
      ];

      msg.channel.send("Hug" + ((msg.mentions.users.size > 1) ? "s" : "") + " on the way!").then(u.clean);

      for (const [id, user] of msg.mentions.users) {
        try {
          let hug = u.rand(hugs);
          user.send(`Incoming hug from **${msg.author.username}**!`, {files: [{"attachment": hug, "name": "hug.gif"}]})
          .catch(e => {
            msg.reply(`I couldn't send a hug to ${msg.guild.members.get(user.id).displayName}. Maybe they blocked me? :shrug:`).then(u.clean);
          });
        } catch(e) { u.errorHandler(e, msg); }
      }
    } else {
      msg.reply("who do you want to hug?").then(u.clean);
    }
  }
})
.addCommand({name: "hype",
  description: "Hype train!",
  aliases: ["hypetrain"],
  info: "Dispatching Hype Train",
  category: "Silly",
  process: (msg) => {
    quickText(msg, ":steam_locomotive: 🇭 :train: 🇾 :train: 🇵 :train: 🇪 :train:");
  }
})
.addCommand({name: "isee",
  description: "I see what you did there!",
  aliases: ["whatyoudid", "whatudid"],
  category: "Silly",
  process: (msg) => {
    quickFile(msg, [
      "https://cdn.discordapp.com/attachments/323176568060903424/324925456337862656/Ep6ndWe.png", // Pie Chart
      "https://media.giphy.com/media/5gw0VWGbgNm8w/giphy.gif", // Gyllenhaal
      "https://media.giphy.com/media/CcUk4a6fkgUfu/giphy.gif", // Prince John
      "https://media.giphy.com/media/12ZDIx1Mw1cXVm/giphy.gif" // DeNiro
    ], "isee.gif");
  }
})
.addCommand({name: "itsgreat",
  description: "It's great! Except...",
  category: "Silly",
  process: (msg) => {
    quickFile(msg, "https://cdn.discordapp.com/attachments/96335850576556032/294187421648551936/image.jpg");
  }
})
.addCommand({name: "minesweeper",
  description: "Play a game of Minesweeper!",
  aliases: ["mines", "sweeper"],
  category: "Silly",
  syntax: "[easy | medium | hard]",
  process: (msg, suffix) => {
    let size = 0;
    let mineCount = 0;

    suffix = suffix.toLowerCase();
    if (suffix.startsWith("e")) {
      size = mineCount = 5;
    } else if (suffix.startsWith("m") || suffix === "") {
      size = 10;
      mineCount = 30;
    } else if (suffix.startsWith("h")) {
      size = 14;
      mineCount = 60;
    } else {
      msg.channel.send("Invalid difficulty. `easy`, `medium`, and `hard` are valid.");
      return;
    }

    // Getting all possible board spaces
    let possibleSpaces = Array.from({ length: size * size }, (v, k) => k);
    // Remove 4 corners, corners can't be mines
    possibleSpaces.splice((size * size) - 1, 1);
    possibleSpaces.splice((size - 1) * size, 1);
    possibleSpaces.splice(size - 1, 1);
    possibleSpaces.splice(0, 1);
    // Finding out where the mines will be
    let mineSpaces = [];
    for (let i = 0; i < mineCount; i++) {
      const random = Math.floor(Math.random() * possibleSpaces.length);
      mineSpaces.push(possibleSpaces[random]);
      possibleSpaces.splice(random, 1);
    }

    function getMineCount(x, y) {
      let count = 0;
      for (let i = -1; i <= 1; i++) {
        if ((x + i) < 0 || (x + i) >= size) continue;
        for (let j = -1; j <= 1; j++) {
          if ((y + j) < 0 || (y + j) >= size) continue;
          if (mineSpaces.includes((y + j) * size + x + i)) count++;
        }
      }

      return count;
    }

    // Creating the final board
    let board = [];
    for (let x = 0; x < size; x++) {
      board.push([]);
      for (let y = 0; y < size; y++) {
        if (mineSpaces.includes(x + (y * size))) {
          board[x].push(9);
          continue;
        }
        board[x].push(getMineCount(x, y));
      }
    }

    let output = board.map(row => row.map(num => `||${num == 9 ? "💣" : emoji[num]}||`).join("")).join("\n");

    msg.channel.send(`**Mines: ${mineCount}** (Tip: Corners are never mines)\n${output}`);
  }
})
.addCommand({name: "ohsnap",
  description: "Oh, snap!",
  aliases: ["snap"],
  category: "Silly",
  process: (msg) => {
    quickFile(msg, [
      "https://cdn.discordapp.com/attachments/154625360514777088/281635879238369280/giphy-9.gif", // Andy Dwyer
      "https://media.giphy.com/media/3o6ozztbjcHUN5V7B6/giphy.gif",  // Fresh Prince
      "https://media.giphy.com/media/xUPGcoUeohKhIesT5K/giphy.gif", // Cohn
      "https://media.giphy.com/media/3oEduNITi4GfwxY1Fu/giphy.gif" // Fallon
    ], "ohsnap.gif");
  }
})
.addCommand({name: "poke",
  description: "Poke it with a stick.",
  category: "Silly",
  process: (msg) => {
    quickFile(msg, "https://cdn.discordapp.com/attachments/209046676781006849/279365238699327490/image.gif");
  }
})
.addCommand({name: "popcorn",
  description: "Popcorn",
  category: "Silly",
  process: (msg) => {
    quickFile(msg, [
      "https://media.giphy.com/media/tFK8urY6XHj2w/giphy.gif", // Colbert
      "https://media.giphy.com/media/t3dLl0TGHCxTG/giphy.gif", // Lansbury
      "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif", // Hader
      "https://media.giphy.com/media/gSRkSblDEjUuk/giphy.gif", // Muppet Bird
      "http://i.imgur.com/q67RbO4.gif", // Moss
      "https://media.giphy.com/media/NipFetnQOuKhW/giphy.gif" // Animal
    ], "popcorn.gif");
  }
})
.addCommand({name: "rainbow",
  description: "Care Bear Stare",
  aliases: ["carebearstare"],
  category: "Silly",
  process: (msg) => {
    quickFile(msg, "https://cdn.discordapp.com/attachments/193042027066163200/288769459764854795/carebearstare.png", "carebearstare.png", false);
  }
})
.addCommand({name: "repost",
  description: "That's a repost.",
  category: "Silly",
  process: (msg) => {
    u.clean(msg, 0);
    const repost = msg.channel.messages.cache
      .filter(m => m.attachments.size > 0)
      .last()
      .attachments.first().url;
    msg.channel.send({files: [repost]});
  }
})
.addCommand({name: "salty",
  description: "Salty",
  aliases: ["salt"],
  category: "Silly",
  process: (msg) => {
    quickFile(msg, [
      "https://cdn.discordapp.com/attachments/209046676781006849/294937224137670656/salty.gif", // Ice age
      "https://media.giphy.com/media/mxKdIoeskbqE/giphy.gif", // Salty much?
      "https://media.giphy.com/media/7f2iTqiznYKvm/giphy.gif" // Hocus Pocus
    ], "salty.gif");
  }
})
.addCommand({name: "shrug",
  description: "¯\\_(ツ)_/¯",
  category: "Silly",
  process: (msg) => {
    quickFile(msg, [
      "https://cdn.discordapp.com/attachments/193042027066163200/301729544618901514/giphy.gif", // Compilation
      "https://cdn.discordapp.com/attachments/193042027066163200/301729459172802562/giphy.gif", // Power Rangers
      "https://cdn.discordapp.com/attachments/193042027066163200/301729409281294336/giphy.gif", // Wobbly
      "https://cdn.discordapp.com/attachments/193042027066163200/301730719380537354/giphy.gif", // Harry
      "https://cdn.discordapp.com/attachments/193042027066163200/301730481341464576/giphy.gif", // Seinfeld
      "https://cdn.discordapp.com/attachments/193042027066163200/301730450882428929/G01Ye.gif", // Elmo
      "https://cdn.discordapp.com/attachments/193042027066163200/301730700405637120/giphy.gif", // Reggie
      "https://cdn.discordapp.com/attachments/193042027066163200/301730956589400064/giphy.gif", // Costanza
      "https://cdn.discordapp.com/attachments/193042027066163200/301730491399274496/giphy.gif" // Colin
    ], "shrug.gif");
  }
})
.addCommand({name: "troll",
  description: "Trollery detected.",
  category: "Silly",
  process: (msg) => {
    quickText(msg, "**Trollery Detected.**\nDispatching Troll Train.\n\n:train: :train: :train:");
  }
})
.addCommand({name: "questions",
  description: "I now have additional questions.",
  category: "Silly",
  process: (msg) => {
    quickFile(msg, "http://i.imgur.com/SeHYADn.gif", "questions.gif");
  }
})
.addCommand({name: "wut",
  description: "Wut?",
  aliases: ["what", "odd", "huh", "wat"],
  category: "Silly",
  process: (msg) => {
    quickFile(msg, [
      "https://media.giphy.com/media/cxMhIIoe5aXfO/giphy.gif", // Walk away
      //"https://cdn.discordapp.com/attachments/154625360514777088/322424415625412609/E7HwlPc_-_Imgur.gif", // Girl
      "http://p.fod4.com/p/media/5c597eb60b/dVJNUJlVS6yeyEYhtJIL_Confused%20Mark%20Wahlberg.gif", // Wahlberg
      "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif", // Mashable
      "https://media.giphy.com/media/Rt23MIHkCJwdy/giphy.gif", // Kevin Hart
      "https://media.giphy.com/media/CDJo4EgHwbaPS/giphy.gif", // Franco
      "https://media.giphy.com/media/PmTWHSzTo53A4/giphy.gif", // Goofy guy
      "https://i.imgur.com/Mbwmjge.gif", // Bobahorse
      "https://giphy.com/gifs/hulu-snl-saturday-night-live-nbc-3o7TKQ8kAP0f9X5PoY" // SNL
    ], "wut.gif");
  }
})
.addEvent("messageReactionAdd", (reaction, user) => {
  if ((reaction.message.channel.id == "121755900313731074") && (reaction.emoji.name == "♻️")) {
    reaction.removeAll();
    reaction.message.react("⭐").catch(u.noop);
  }
})
.setClockwork(() => {
  try {
    let bot = Module.client;
    return setInterval(testBirthdays, 60 * 60 * 1000, bot);
  } catch(e) { u.errorHandler(e, "Birthday Clockwork Error"); }
});

module.exports = Module;
