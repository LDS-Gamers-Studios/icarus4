const Augur = require("augurbot"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "tournament",
	description: "Add or remove members from the Tournament Paricipant role",
	syntax: "add/remove @user, stop",
	process: (msg, suffix) => {
		let role = "309889475633348608";
		u.clean(msg);
		if ((suffix.toLowerCase() == "stop") || (suffix.toLowerCase() == "done")) {
			msg.guild.roles.get(role).members.forEach(member => {
				member.removeRole(role);
			});

			msg.channel.fetchMessages({limit:1000}).then(messages => {
				msg.channel.bulkDelete(messages, true);
			});

			msg.channel.send("Removed all Tournament Participants").then(u.clean);
		} else if (msg.mentions.members.size == 0) {
			 msg.reply("you need to tell me who to add or remove.").then(u.clean);
		} else if (suffix.toLowerCase().startsWith("add")) {
			msg.mentions.members.forEach(member => {
				member.addRole(role).then(function(m) {
					msg.channel.send("Added the role to " + m.displayName).then(u.clean);
				});
			});
		} else if (suffix.toLowerCase().startsWith("remove")) {
			msg.mentions.members.forEach(member => {
				member.removeRole(role).then(function(m) {
					msg.channel.send("Removed the role from " + m.displayName).then(u.clean);
				});
			});
		} else {
			msg.reply("you need to tell me whether to add or remove the user to the channel.").then(u.clean);
		}
	},
	permissions: (msg) => (msg.guild && (msg.member.roles.has("96345401078087680")))
})

module.exports = Module;
