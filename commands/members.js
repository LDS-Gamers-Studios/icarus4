const Augur = require("augurbot"),
  request = require("request"),
  cheerio = require("cheerio"),
  u = require("../utils/utils");

function userEmbed(member) {
	let roles = member.roles.map(role => role.name);
	let embed = u.embed()
		.setTitle(member.displayName)
		.addField("ID", member.id, true)
		.addField("Joined", member.joinedAt.toUTCString(), true)
		.addField("Account Created", member.user.createdAt.toUTCString(), true)
		.addField("Roles", roles.join(", "), true);

	if (member.user.displayAvatarURL) embed.setThumbnail(member.user.displayAvatarURL);

	return embed;
}

const Module = new Augur.Module()
.addCommand({name: "avatar",
  description: "Get a user's avatar",
  syntax: "[@user]",
  process: (msg) => {
    let user = (msg.mentions.users.size > 0 ? msg.mentions.users.first() : msg.author);
    if (user.avatarURL) {
      let member = ((msg.guild) ? msg.guild.members.get(user.id) : null);
      let name = (member ? member.displayName : user.username);
      let embed = u.embed()
        .setAuthor(name)
        .setDescription(name + "'s Avatar")
        .setImage(user.avatarURL);
      msg.channel.send({embed: embed});
    } else {
      msg.reply(user + " has not set an avatar.").then(u.clean);
    }
  },
})
.addCommand({name: "info",
  description: "Check when a user joined the server",
  syntax: "[@user]",
  category: "Members",
  process: (msg, suffix) => {
    let users = null;
    let mentions = msg.mentions.users;

    if (!suffix) users = [msg.author];
    else if (mentions) users = mentions;
    else if (suffix) {
      users = suffix.split(/ ?\| ?/);
      if (users.length > 4) { msg.channel.send("Limit of 4 users at once").then(u.clean).catch(console.error); return; }
    }

    users.forEach(user => {
      let member = null;
      if (user.id) {
        member = msg.guild.members.get(user.id);
      } else {
        member = msg.guild.members.find('displayName', user);
      }

      if (member) {
        msg.channel.send({embed: userEmbed(member), disableEveryone: true});
      } else msg.channel.send("User \"" + user + "\" not found");
    });
  },
  permissions: (msg) => msg.guild
})
.addCommand({name: "fullinfo",
  description: "Check when a user joined the server and rank information",
  syntax: "[@user]",
  category: "Members",
  hidden: true,
  process: (msg, suffix) => {
    Module.handler.execute("info", msg, suffix);
    Module.handler.execute("rank", msg, suffix);
  },
  permissions: (msg) => msg.guild
})
.addCommand({name: "members",
  description: "How many members are in LDSG?",
  category: "Members",
  permissions: (msg) => msg.guild,
  process: (msg) => {
    let	members = msg.guild.members;
    let	online = 0;

    members.forEach(function(member) {
      if (member.presence.status != "offline")
        online++;
    });

    let response = `📈 **Members:**\n${msg.guild.memberCount} Members\n${online} Online`;
    msg.channel.send(response).catch(console.error);
  }
})
.addCommand({name: "spotlight",
  description: "Get the current member spotlight",
  category: "Members",
  process: (msg) => {
    let memberUrl = 'http://ldsgamers.com/community';

    request(memberUrl, async function(error, response, body) {
      try {
        if (!error && response.statusCode == 200) {
          let $ = cheerio.load(body);
          let name = $('.member-content > h2')[0].children[0].data;
          let discordId = $('.member-content > h2')[0].attribs["data-discordid"];
          let text = $('.featured-member-content > p:first-of-type')[0].children[0].data;

          let embed = u.embed()
            .setTitle("MEMBER SPOTLIGHT")
            .setURL(`${memberUrl}#member-spotlight`)
            .setDescription('Our community is filled with amazing people. Know someone that deserves the spotlight? Nominate them by sending CJ Stormblessed a message!');

          let discordUser = null;

          if (msg.guild && (msg.guild.id == Module.config.ldsg)) {
            discordUser = await msg.guild.fetchMember(discordId);
          } else discordUser = await bot.fetchUser(discordId);

          let avatar = (discordUser.user ? discordUser.user.avatarURL : discordUser.avatarURL);
          let image = (avatar)?(avatar):("http://ldsgamers.com" + $('.member-image > img')[0].attribs.src);

          //let communityContent = `__**MEMBER SPOTLIGHT**__\nOur community is filled with amazing people. Know someone that deserves the spotlight? Nominate them here: <http://ldsg.io/nominate>\n\nThe spotlight currently shines on **<@${discordId}>**!\n\n${text} ...\n\nTo read more, go to <${memberUrl}#member-spotlight>.`;
          //msg.channel.send(communityContent, {"file": {"attachment": image}}).catch(console.error);

          embed.addField('Current Spotlight', `The spotlight currently shines on **${(discordUser.displayName ? discordUser.displayName : discordUser.username)}**!\n\n${text} ...\n[READ MORE](${memberUrl}#member-spotlight)`)
            .setThumbnail(image);

          msg.channel.send({embed: embed});

        }
      } catch(e) { Module.handler.errorHandler(e, msg); }
    });
  }
});

module.exports = Module;
