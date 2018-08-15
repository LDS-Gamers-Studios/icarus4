const u = require("../utils/utils"),
  Augur = require("augurbot");

var availableNames = [
	"Room Buttermelon",
  "Room Slothmare",
  "Room Handicorn",
  "Room Manahands",
  "Room Toxipandankery",
  "Room Cornmuffin",
  "Room Shenanigans",
  "Room Fancypants",
  "Room Thunderpaws",
  "Room Barley",
  "Room Fry Sauce",
  "Room Goat",
  "Room Ink",
	"Room Potato",
  "Room Trogdor",
];

const Module = new Augur.Module()
.addCommand({name: "lock",
  syntax: "[@additionalUser(s)]",
  description: "Locks your current voice channel to new users",
  permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voiceChannel && availableNames.includes(msg.member.voiceChannel.name)),
  process: (msg) => {
  	let channel = msg.member.voiceChannel;
  	if (channel && availableNames.includes(channel.name)) {
  		let users = Array.from(channel.members.values()).concat(Array.from(msg.mentions.members.values()));
      users.push(msg.client.user);

  		let channelMods = [];
  		let muted = Module.config.roles.muted;

  		channelMods.push(channel.overwritePermissions(msg.guild.id, {CONNECT: false}));

  		channel.permissionOverwrites.forEach(permission => {
  			if ((permission.id != muted) && (permission.id != msg.guild.id) && !users.map(u => u.id).includes(permission.id)) channelMods.push(permission.delete());
  		});

  		users.forEach(user => {
  			channelMods.push(channel.overwritePermissions(user, {CONNECT: true}));
  		});

  		Promise.all(channelMods).then(() => {
  			msg.channel.send(`${channel.name} locked to all users except ${users.filter(u => u.id !== msg.client.user.id).map(u => u.displayName).join(", ")}`);
  		});
  	} else {
  		msg.reply("you need to be in a community voice channel to use this command!").then(u.clean);
  	}
  }
})
.addCommand({name: "unlock",
	description: "Unlocks your current voice channel for new users",
	permissions: (msg) => (msg.guild && (msg.guild.id == Module.config.ldsg) && msg.member.voiceChannel && availableNames.includes(msg.member.voiceChannel.name)),
	process: (msg) => {
		let channel = msg.member.voiceChannel;
		if (channel && availableNames.includes(channel.name)) {
			let channelMods = [];
			let muted = Module.config.roles.muted;
			channelMods.push(channel.overwritePermissions(msg.guild.id, {CONNECT: null}));
			channel.permissionOverwrites.forEach(permission => {
				if ((permission.id != muted) && (permission.id != msg.guild.id)) channelMods.push(permission.delete());
			});

			Promise.all(channelMods).then(() => {
				msg.channel.send(`${channel.name} is now open to all users.`);
			});
		} else {
			msg.reply("you need to be in a community voice channel to use this command!").then(u.clean);
		}
	}
})
.addEvent("voiceStateUpdate", (oldMember, newMember) => {
  if ((oldMember.guild.id == Module.config.ldsg) && (oldMember.voiceChannelID != newMember.voiceChannelID)) {
    if (oldMember.voiceChannelID && (oldMember.voiceChannel.members.size == 0) && availableNames.includes(oldMember.voiceChannel.name)) {
      // REMOVE OLD VOICE CHANNEL
      oldMember.voiceChannel.delete().catch(console.error);
    }
    if (newMember.voiceChannelID && (newMember.voiceChannel.members.size == 1) && availableNames.includes(newMember.voiceChannel.name)) {
      // CREATE NEW VOICE CHANNEL
      let name = "";
      for (var i = 0; (i < availableNames.length && !name); i++) {
        if (!newMember.guild.channels.find(c => c.name == availableNames[i])) name = availableNames[i];
      }
      if (!name) name = availableNames[0];
      newMember.guild.createChannel(name, "voice").then(channel => {
        channel.setParent("363014069533540362");
      });
    }
  }
});

module.exports = Module;
