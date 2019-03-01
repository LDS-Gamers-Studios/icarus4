const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "roll",
  description: "Roll dice",
  syntax: "Dice Expression (e.g. 2d6+3)",
  aliases: ["dice"],
  process: (msg, suffix) => {
    if (!suffix) suffix = "1d6";
    suffix = suffix.toLowerCase().replace(/-/g, "+-").replace(/ /g, "");
    let diceExp = /(\d+)?d\d+(\+-?(\d+)?d?\d+)*/;
    let dice = diceExp.exec(suffix);
    let fateExp = /(\d+)?df(\+-?\d+)?/i;
    let fate = fateExp.exec(suffix);
    if (dice) {
      let exp = dice[0].replace(/\+-/g, "-");
      dice = dice[0].split("+");

      let rolls = [];
      let total = 0;

      dice.forEach((d, di) => {
        rolls[di] = [];
        if (d.includes("d")) {
          let add = (d.startsWith("-") ? -1 : 1);
          if (add == -1) d = d.substr(1);
          if (d.startsWith("d")) d = `1${d}`;
          let exp = d.split("d");
          let num = parseInt(exp[0], 10);
          if (num && num <= 100) {
            for (var i = 0; i < num; i++) {
              let val = Math.ceil(Math.random() * parseInt(exp[1], 10)) * add;
              rolls[di].push((i == 0 ? `**${d}:** ` : "") + val);
              total += val;
            };
          } else {
            msg.reply("I'm not going to roll *that* many dice... 🙄").then(u.clean);
            return;
          }
        } else {
          total += parseInt(d, 10);
          rolls[di].push(`**${d}**`);
        }
      });
      if (rolls.length > 0) {
        let response = `${msg.author} rolled ${exp} and got:\n${total}`
          + ((rolls.reduce((a, c) => a + c.length, 0) > 20) ? "" : ` ( ${rolls.reduce((a, c) => a + c.join(", ") + "; ", "")})`);
        msg.channel.send(response, {split: {maxLength: 1950, char: ","}});
      } else
        msg.reply("you didn't give me anything to roll.").then(u.clean);
    } else if (fate) {
      let exp = fate[0].replace(/\+-/g, "-");
      dice = fate[0].split("+");

      let rolls = [];
      dice.forEach(d => {
        if (d.includes("df")) {
          let add = (d.startsWith("-") ? -1 : 1);
          if (add == -1) d = d.substr(1);
          if (d.startsWith("df")) d = `1${d}`;
          let num = parseInt(d, 10);
          if (num && num <= 100)
            for (var i = 0; i < num; i++) rolls.push( (Math.floor(Math.random() * 3) - 1) * add );
          else {
            msg.reply("I'm not going to roll *that* many dice... 🙄").then(u.clean);
            return;
          }
        } else rolls.push(parseInt(d, 10));
      });
      if (rolls.length > 0) {
        let response = `${msg.author} rolled ${exp} and got:\n${rolls.reduce((c, d) => c + d, 0)}`
          + ((rolls.length > 20) ? "" : ` (${rolls.join(", ")})`);
        msg.channel.send(response, {split: {maxLength: 1950, char: ","}});
      } else
        msg.reply("you didn't give me anything to roll.").then(u.clean);
    } else
      msg.reply("that wasn't a valid dice expression.").then(u.clean);
  }
})

module.exports = Module;
