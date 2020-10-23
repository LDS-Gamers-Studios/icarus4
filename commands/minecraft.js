const Augur = require("augurbot"),
  request = require("request-promise-native"),
  u = require("../utils/utils),
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
        let ign = await Module.db.ign.find(user.id, 'minecraft');
        if (ign) name = encodeURIComponent(ign.ign);
        else {
          msg.channel.send(`${user} has not set a Minecraft name with \`!addign minecraft\`.`).then(u.clean);
          return;
        }
      } else name = encodeURIComponent(suffix);

      try {
        let uuid = await minecraft.getPlayerUUID(name);
        if (!uuid) {
          msg.channel.send("I couldn't find a Minecraft account with the username `" + name + "`.").then(u.clean);
          return;
        }

        // The "body" part of this has other options for other skin views, that can be implemented later.
        let skinUrl = "https://crafatar.com/renders/body/" + uuid;
        msg.channel.send({ files: [skinUrl] });
      } catch (e) { u.errorHandler(e, "Minecraft UUID/Skin Grab Error"); }
    }
});

module.exports = Module;
