const Augur = require("augurbot"),
  u = require("../utils/utils"),
  milestone = 4000,
  pizza = false;

const Module = new Augur.Module()
.addEvent("guildMemberAdd", async (member) => {
  try {
    if (member.guild.id == Module.config.ldsg) {
      let guild = member.guild;
      let bot = member.client;

      let user = await Module.db.user.fetchUser(member.id);
      let general = guild.channels.cache.get(Module.config.ldsg); // #general
      let welcomeChannel = guild.channels.cache.get(Module.config.channels.welcome); // #welcome
      let modLogs = guild.channels.cache.get(Module.config.channels.modlogs); // #mod-logs

      let embed = u.embed()
      .setDescription("Account Created:\n" + member.user.createdAt.toLocaleDateString())
      .setTimestamp()
      .setThumbnail(member.user.displayAvatarURL({dynamic: true}));

      let welcomeString;

      if (user) { // Member is returning
        if (user.roles.length > 0) member = await member.roles.add(user.roles.filter(role => guild.roles.cache.has(role)));

        let roleString = member.roles.cache.map(role => role.name).join(", ");
        if (roleString.length > 1024) roleString = roleString.substr(0, roleString.indexOf(", ", 1000)) + " ...";

        embed.setTitle(member.displayName + " has rejoined the server.")
          .addField("Roles", roleString);
        welcomeString = `Welcome back, ${member}! Glad to see you again.`;

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
        welcomeString = `${u.rand(welcome)}, ${member}! ${u.rand(info1)} ${welcomeChannel} ${u.rand(info2)}. ${u.rand(info3)}\n\nLooking for roles? Try \`!help addrole\` over in <#${Module.config.channels.botspam}>`;
        embed.setTitle(member.displayName + " has joined the server.");

        Module.db.user.newUser(member.id);
      }
      modLogs.send({embed});
      if (pizza && (guild.members.size < milestone)) welcomeString += `\n*${milestone - guild.members.size} more members until we have a pizza party!*`;
      if (!member.roles.cache.has(Module.config.roles.muted) && !member.user.bot)
        general.send(welcomeString);
      if (guild.members.size == milestone) {
        general.send(`:tada: :confetti_ball: We're now at ${milestone} members! :confetti_ball: :tada:`);
        modLogs.send(`:tada: :confetti_ball: We're now at ${milestone} members! :confetti_ball: :tada:\n*pinging for effect: <@96335658997526528> <@111232201848295424>*`);
      }
    }
  } catch(e) { u.errorHandler(e, "New Member Add"); }
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
      member.guild.channels.cache.get(Module.config.channels.modlogs).send(response.join("\n"));
    });
  }
});

module.exports = Module;
