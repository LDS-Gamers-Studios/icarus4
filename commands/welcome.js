const Augur = require("augurbot"),
  u = require("../utils/utils"),
  mod_log = "506575671242260490",
  milestone = 4000,
  pizza = false;

var r = (parts) => parts[Math.floor(Math.random() * parts.length)];

const Module = new Augur.Module()
.addEvent("guildMemberAdd", async (member) => {
  try {
    if (member.guild.id == Module.config.ldsg) {
      let guild = member.guild;
      let bot = member.client;

      let user = await Module.db.user.fetchUser(member.id);
      let general = bot.channels.get("96335850576556032"); // #general
      let welcomeChannel = bot.channels.get("121751722308796416"); // #welcome
      let modLogs = bot.channels.get(mod_log); // #mod-logs

      let embed = u.embed()
      .setDescription("Account Created:\n" + member.user.createdAt.toLocaleDateString());
      if (member.user.avatarURL) embed.setThumbnail(member.user.avatarURL);

      let welcomeString = "";

      if (user) { // Member is returning
        embed.setTitle(member.displayName + " has rejoined the server.");
        welcomeString = `Welcome back, ${member}! Glad to see you again.`;
        if (user.roles.length > 0) member = await member.addRoles(user.roles);
      } else { // Member is new
        let welcome = [
          "Welcome",
          "Hi there",
          "Glad to have you here",
          "Ahoy"
        ];
        let info1 = [
          "Take a look at",
          "Check out",
          "Head on over to"
        ];
        let info2 = [
          "to get started",
          "for some basic community rules",
          "and join in the chat"
        ];
        let info3 = [
          "What brings you our way?",
          "How'd you find us?",
          "What platforms/games do you play?"
        ];
        welcomeString = `${r(welcome)}, ${member}! ${r(info1)} ${welcomeChannel} ${r(info2)}. ${r(info3)}`;
        embed.setTitle(member.displayName + " has joined the server.");

        Module.db.user.newUser(member.id);
      }
      modLogs.send(embed);
      if (pizza && (guild.members.size < milestone)) welcomeString += `\n*${milestone - guild.members.size} more members until we have a pizza party!*`;
      if (!member.roles.has(Module.config.roles.muted) && !member.user.bot)
        general.send(welcomeString);
      if (guild.members.size == milestone) {
        general.send(`:tada: :confetti_ball: We're now at ${milestone} members! :confetti_ball: :tada:`);
        modLogs.send(`:tada: :confetti_ball: We're now at ${milestone} members! :confetti_ball: :tada:\n*pinging for effect: <@96335658997526528> <@111232201848295424>*`);
      }
    }
  } catch(e) { u.alertError(e, "New Member Add"); }
})
.addEvent("guildMemberRemove", (member) => {
  if (member.guild.id == Module.config.ldsg) {
    Module.db.user.updateRoles(member);
    Module.db.user.fetchUser(member.id).then(user => {
      let response = [
        `**${member.displayName}** has left the server.`,
        "Joined: " + member.joinedAt.toLocaleDateString(),
        "Posts: " + user.posts
      ];
      member.client.channels.get(mod_log).send(response.join("\n"));
    });
  }
});

module.exports = Module;
