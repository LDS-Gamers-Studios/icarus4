const Augur = require("augurbot");

var r = (parts) => parts[Math.floor(Math.random() * parts.length)];

const Module = new Augur.Module()
.addEvent("guildMemberAdd", async (member) => {
  if (member.guild.id == Module.config.ldsg) {
    let guild = member.guild;
    let bot = member.client;

    let user = await Module.db.user.fetchUser(member.id);
		let general = bot.channels.get("96335850576556032"); // #general
		let welcomeChannel = bot.channels.get("121751722308796416"); // #welcome
    let modLogs = bot.channels.get("154676105247195146"); // #mod-logs

		let embed = new Discord.RichEmbed()
			.setDescription("Account Created:\n" + member.user.createdAt.toLocaleDateString());
		if (member.user.avatarURL) embed.setThumbnail(member.user.avatarURL);

		let welcomeString = "";

		if (user) { // Member is returning
			embed.setTitle(member.displayName + " has rejoined the server.");
			welcomeString = `Welcome back, ${member}! Glad to see you again.`;
			if (user.roles.length > 0) member.addRoles(user.roles);
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
		general.send(welcomeString);
  }
});

module.exports = Module;
