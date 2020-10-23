const Augur = require("augurbot"),
  request = require("request-promise-native"),
  minecraft = require("../utils/minecraftAPI");

const Module = new Augur.Module()
  .addCommand({
    name: "minecraftskin",
    description: "Gets the Minecraft skin of a user.",
    syntax: "[@user]",
    category: "Minecraft",
    process: async (msg, suffix) => {
      let user = false,
        name = false;

      if (u.userMentions(msg).size > 0) {
        user = u.userMentions(msg).first();
      } else if (!suffix) {
        user = msg.author;
      }

      if (user) {
        let ign = await Module.db.ign.find(user.id, 'twitch');
        if (ign) name = encodeURIComponent(ign.ign);
        else {
          msg.channel.send(user + " has not set a Minecraft name with `!addign minecraft`.").then(u.clean);
          return;
        }
      } else name = encodeURIComponent(suffix);

      let uuid = await minecraft.getPlayerUUID(name);
      if (!uuid) {
        msg.channel.send("I couldn't find a Minecraft account with the username `" + name + "`.").then(u.clean);
        return;
      }

      // I added the skin type option for later potential, but for the moment
      // we'll just leave it as "body".
      let skinUrl = await minecraft.getPlayerSkin(uuid, "body");
      msg.channel.send({ files: [skinUrl] });
    }
});

module.exports = Module;