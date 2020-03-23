const u = require("../utils/utils"),
  Augur = require("augurbot");

const Module = new Augur.Module()
.addCommand({name: "choose",
  description: "Chooses between options",
  syntax: "<option1> | <option2> | <option3> ...",
  info: "Helps make a choice!",
  aliases: ["decide", "pick", "choice"],
  process: (msg, suffix) => {
    if (suffix && suffix.includes("|")) {

      let decideText = ["I choose", "I pick", "I decided"];
      decideText = decideText[Math.floor(Math.random() * decideText.length)];

      let choices = suffix.split("|");
      let chosen = choices[Math.floor(Math.random() * choices.length)].trim();

      msg.reply(`${decideText} **${chosen}**`);
    } else {
      msg.reply("you need to give me two or more choices!").then(u.clean);
    }
  }
})
.addCommand({name: "cheapshark",
  description: "Searches CheapShark for game deals",
  syntax: "Game",
  aliases: ["deals"],
  process: (msg, suffix) => {
    if (suffix) msg.channel.send(`Find deals for ${suffix} here:\nhttps://www.cheapshark.com/browse?title=${encodeURIComponent(suffix.trim())}`);
    else msg.reply("you need to give me a game to find!").then(u.clean);
  }
})
.addCommand({name: "remind",
  aliases: ["remindme", "reminder"],
  description: "Sets a reminder via DM from the bot.",
  syntax: "MM/DD/YYYY HH:MM Reminder Text",
  info: "Sets a reminder, which will be received by DM from the bot. The reminder will come *within 15 minutes* after the time. Times are Eastern Standard Time.",
  process: async (msg, suffix) => {
    try {
      let dateString = suffix.split(" ");
      let reminder = dateString.splice(2).join(" ");
      let timestamp = new Date(dateString.join(" "));
      if (reminder && timestamp.valueOf()) {
        await Module.db.reminder.setReminder({
          discordId: msg.author.id,
          reminder,
          timestamp
        });
        msg.react("👌");
      } else {
        msg.reply("you need to use the following format:\n> MM/DD/YY HH:MM Your Reminder Text\nTimes are based on a 24 hour format and are parsed in EST.");
      }
    } catch(error) { u.alertError(error, msg); }
  }
})
.addCommand({name: "timer",
  description: "Set a timer.",
  syntax: "HH:MM:SS Label",
  process: (msg, suffix) => {
    let [timer, ...label] = suffix.split(" ");
    label = (label.length > 0 ? label.join(" ") || "Unnamed");
    let times = timer.split(":").map(t => parseInt(t, 10));
    if (times.length <= 3 && times.length > 0) {
      let time = 0;
      let multiplier = [1000, 60000, 3600000];
      for (let i = 0; i < times.length; i++) {
        let t = times[times.length - i - 1];
        if (t) time += t * multiplier[i];
      }
      setTimeout((m, l, d) => {
        m.reply(`your ${l} timer (${d}) is up!`);
      }, time, msg, label, timer);
    } else {
      msg.reply("you need to give me a duration in HH:MM:SS format!").then(u.clean);
    }
  }
})
.setClockwork(() => {
  return setInterval(async () => {
    try {
      let reminders = await Module.db.reminder.fetchReminders();
      for (reminder of reminders) {
        try {
          let user = Module.handler.client.users.get(reminder.discordId);
          if (user) {
            let embed = u.embed()
            .setTitle("REMINDER")
            .setTimestamp(reminder.timestamp)
            .setDescription(reminder.reminder);
            user.send({embed}).catch(u.noop);
          }
          await Module.db.reminder.complete(reminder);
        } catch(e) { u.alertError(e, "Complete Reminder"); }
      }
    } catch(error) { u.alertError(error, "Execute Reminders"); }
  }, 15 * 60000);
});

module.exports = Module;
