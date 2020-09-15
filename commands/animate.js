const Augur = require("augurbot"),
  u = require("../utils/utils");

async function reload(msg) {
  try {
    let reactions;
    do {
      reactions = await msg.awaitReactions(
        (reaction, user) => ((reaction.emoji.name == "🔁") && !user.bot),
        {max: 1}
      );

      if (reactions.size > 0) {
        let reaction = reactions.first();
        let frames = await Module.db.animation.fetch(msg.id);
        if (frames) {
          let m = await reaction.message.reactions.removeAll();
          nextFrame(m, frames.frames);
        }
      }
    } while (reactions.size > 0)
  } catch(e) { u.errorHandler(e, "Animation Reload Error"); }
}

async function animate(msg, frames, delay = 1000) {
  try {
    let store = frames.map(f => f);
    let m = await msg.channel.send(frames.shift());
    Module.db.animation.save({animationId: m.id, channelId: m.channel.id, frames: store});

    if (frames.length > 0) nextFrame(m, frames, delay);
    else m.react("🔁");
    reload(m);
  } catch(e) { u.errorHandler(e, "Animate Error"); }
}

function nextFrame(msg, frames, delay = 1000) {
  setTimeout(async () => {
    try {
      let m = await msg.edit(frames.shift());
      if (frames.length > 0) nextFrame(m, frames, delay);
      else m.react("🔁");
    } catch(e) { u.errorHandler(e, "Animate nextFrame Error"); }
  }, delay);
};

async function loadAnimations() {
  try {
    let bot = Module.client;
    if (bot.readyAt) {
      let animations = await Module.db.animation.fetchAll();
      for (let i = 0; i < animations.length; i++) {
        let animation = animations[i];
        let channel = await bot.channels.fetch(animation.channelId);
        if (animation.channelId && channel) {
          let msg = await channel.messages.fetch(animation.animationId);
          reload(msg);
        }
      }
    }
  } catch(e) { u.errorHandler(e, "Animation Load Error"); }
}

const Module = new Augur.Module()
.addCommand({name: "mariokart",
  description: "Mario Kart frame animation.",
  aliases: ["mk"],
  process: (msg) => {
    let blueshell = msg.guild.emojis.find("name", "blueshell").toString();
    let frames = [
      ":red_car:                      :blue_car:     :taxi:",
      ":red_car:          " + blueshell + "  :blue_car:     :taxi:",
      ":red_car: " + blueshell + " :dash: :blue_car:     :taxi:",
      ":boom:     :blue_car: :taxi:",
      ":blue_car: :taxi:     :red_car:"
    ];
    animate(msg, frames);
  },
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg))
})
.addCommand({name: "volcano",
  description: "Volcano Animation",
  process: (msg) => {
    let frames = [
      [
        ":black_large_square::black_large_square::black_large_square::black_large_square::black_large_square::black_large_square:",
        ":black_large_square::white_large_square::white_large_square::white_large_square::white_large_square::black_large_square:",
        ":black_large_square::white_large_square::speech_left::penguin::white_large_square::black_large_square:",
        ":black_large_square::white_large_square::white_large_square::white_large_square::white_large_square::black_large_square:",
        ":black_large_square::black_large_square::black_large_square::black_large_square::black_large_square::black_large_square:",
        "              *gasp!*",
        "       What was that!?"
      ].join("\n"),
      [
        ":black_large_square::black_large_square::black_large_square::black_large_square::black_large_square::black_large_square:",
        ":black_large_square::white_large_square::white_large_square::white_large_square::white_large_square::black_large_square:",
        ":black_large_square::white_large_square::volcano::fire::white_large_square::black_large_square:",
        ":black_large_square::white_large_square::white_large_square::white_large_square::white_large_square::black_large_square:",
        ":black_large_square::black_large_square::black_large_square::black_large_square::black_large_square::black_large_square:",
        "            **KA-BOOM!**"
      ].join("\n"),
      [
        ":black_large_square::black_large_square::black_large_square::black_large_square::black_large_square::black_large_square:",
        ":black_large_square::white_large_square::white_large_square::white_large_square::white_large_square::black_large_square:",
        ":black_large_square::white_large_square::speech_left::monkey_face::white_large_square::black_large_square:",
        ":black_large_square::white_large_square::white_large_square::white_large_square::white_large_square::black_large_square:",
        ":black_large_square::black_large_square::black_large_square::black_large_square::black_large_square::black_large_square:",
        "            Let's do this!"
      ].join("\n"),
      [
        ":black_large_square::black_large_square::black_large_square::black_large_square::black_large_square::black_large_square:",
        ":black_large_square::fire::white_large_square::evergreen_tree::white_large_square::black_large_square:",
        ":black_large_square::evergreen_tree::snowboarder::fire::white_large_square::black_large_square:",
        ":black_large_square::white_large_square::fire::white_large_square::evergreen_tree::black_large_square:",
        ":black_large_square::black_large_square::black_large_square::black_large_square::black_large_square::black_large_square:"
      ].join("\n")
    ];
    animate(msg, frames);
  }
})
.addEvent("ready", loadAnimations)
.setInit(loadAnimations);

module.exports = Module;
