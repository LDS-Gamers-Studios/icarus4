const u = require("../utils/utils"),
  Augur = require("augurbot");

const availableNames = [
  "Room Barley",
	"Room Buttermelon",
	"Room Cornmuffin",
  "Room Fancypants",
  "Room Fry Sauce",
  "Room Goat",
	"Room Handicorn",
  "Room Ink",
	"Room Manahands",
	"Room Potato",
	"Room Shenanigans",
	"Room Slothmare",
	"Room Thunder Paws",
	"Room Toxipandankery",
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

  		let channelMods = [];
  		let muted = msg.guild.roles.find("name", "Muted").id;

  		channelMods.push(channel.overwritePermissions(msg.guild.id, {CONNECT: false}));

  		channel.permissionOverwrites.forEach(permission => {
  			if ((permission.id != muted) && (permission.id != msg.guild.id) && !users.map(u => u.id).includes(permission.id)) channelMods.push(permission.delete());
  		});

  		users.forEach(user => {
  			channelMods.push(channel.overwritePermissions(user, {CONNECT: true}));
  		});

  		Promise.all(channelMods).then(() => {
  			msg.channel.send(`${channel.name} locked to all users except ${users.map(u => u.displayName).join(", ")}`);
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
			let muted = msg.guild.roles.find("name", "Muted").id;
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
      oldMember.voiceChannel.overwritePermissions(oldMember.guild.id, {CONNECT: null}).then(() => {
        oldMember.voiceChannel.delete().catch(console.error);
      });
    }
    if (newMember.voiceChannelID && (newMember.voiceChannel.members.size == 1) && availableNames.includes(newMember.voiceChannel.name)) {
      // CREATE NEW VOICE CHANNEL
      let temp = [], n = availableNames.length, name = "";
      for (var i = 0; i < n; i++) {
        temp.unshift(availableNames.splice(Math.floor(Math.random() * availableNames.length), 1)[0]);
        if (!name && !newMember.guild.channels.find("name", temp[0])) name = temp[0];
      }
      if (!name) name = temp[0];
      availableNames = temp;
      for (var i = 0; i < availableNames.length; i++) {
        name = availableNames[i];
        if (!newMember.guild.channels.find("name", name)) break;
      }
      newMember.voiceChannel.clone(name).then(channel => {
        channel.setParent("363014069533540362");
      });
    }
  }
});

module.exports = Module;
