const Augur = require("augurbot"),
  request = require("request"),
  cheerio = require("cheerio"),
  u = require("../utils/utils"),
  Discord = require("discord.js");

function userEmbed(member) {
  let roleString = member.roles.cache.map(role => role.name).join(", ");
  if (roleString.length > 1024) roleString = roleString.substr(0, roleString.indexOf(", ", 1000)) + " ...";
  let embed = u.embed()
    .setTitle(u.escapeText(member.displayName))
    .addField("ID", member.id, true)
    .addField("Joined", member.joinedAt.toUTCString(), true)
    .addField("Account Created", member.user.createdAt.toUTCString(), true)
    .addField("Roles", roleString, true)
    .setThumbnail(member.user.displayAvatarURL({size: 32, dynamic: true}));

  return embed;
}

const Module = new Augur.Module()
.addCommand({name: "info",
  description: "Check when a user joined the server",
  syntax: "[@user]",
  category: "Members",
  process: async (msg, suffix) => {
    try {
      let members = null;

      if (!suffix) members = [msg.member];
      else if (msg.mentions.members.size > 0) members = Array.from(msg.mentions.members.values());
      else if (suffix) members = [suffix];

      for (let member of members) {
        let memberName = member;
        if (typeof member == "string") member = await msg.guild.members.fetch({query: member, limit: 1});
        if (member instanceof u.Collection) member = member.first();

        if (member) {
          msg.channel.send({embed: userEmbed(member), disableEveryone: true});
        } else msg.channel.send("User \"" + memberName + "\" not found");
      }
    } catch(error) { u.errorHandler(error, msg); }
  },
  permissions: (msg) => msg.guild
})
.addCommand({name: "fullinfo",
  description: "Check when a user joined the server and rank information",
  syntax: "[@user]",
  category: "Members",
  hidden: true,
  process: (msg, suffix) => {
    Module.client.commands.execute("info", msg, suffix);
    Module.client.commands.execute("rank", msg, suffix);
    Module.client.commands.execute("infractionsummary", msg, suffix);
  },
  permissions: (msg) => msg.guild
})
.addCommand({name: "members",
  description: "How many members are in LDSG?",
  category: "Members",
  permissions: (msg) => msg.guild,
  process: (msg) => {
    let online = 0;

    for (const [id, member] of msg.guild.members.cache) {
      if (member.presence.status != "offline")
      online++;
    }

    let response = `📈 **Members:**\n${msg.guild.memberCount} Members\n${online} Online`;
    msg.channel.send(response).catch(console.error);
  }
})
.addCommand({name: "profilecard",
  hidden: true,
  description: "Display a user's profile card",
  syntax: "[@user]",
  category: "Members",
  permissions: (msg) => msg.guild && msg.guild.id == Module.config.ldsg,
  process: async (msg) => {
    try {
      const badgeData = require("../utils/badges"),
        RankInfo = require("../utils/RankInfo"),
        Jimp = require("jimp");
      const badgePath = "./site/public/images/badges/";
      const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
      const card = await Jimp.read("./storage/background.jpg");

      const target = msg.mentions.members.first() || msg.member;

      const rank = await Module.db.user.findXPRank(target);
      const badges = badgeData(target.roles.cache);

      const avatar = await Jimp.read(target.user.displayAvatarURL({size: 64, format: "png"}));

      card.blit(avatar, 8, 8)
      .print(font, 80, 8, target.displayName.replace(/[^\x00-\x7F]/g, ""), 212)
      .print(font, 80, 28, "Joined: " + target.joinedAt.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }), 212);

      let rankOffset = (rank.excludeXP ? 80 : 168);
      if (!rank.excludeXP) {
        let level = RankInfo.level(rank.totalXP);
        card.print(font, 8, 80, `Current Level: ${level} (${rank.totalXP.toLocaleString()} XP)`, 284)
        .print(font, 8, 100, `Next Level: ${RankInfo.minXp(level + 1).toLocaleString()} XP`, 284)
        .print(font, 8, 128, `Season Rank: ${rank.currentRank}/${msg.guild.memberCount}`, 138)
        .print(font, 154, 128, `Lifetime Rank: ${rank.lifeRank}/${msg.guild.memberCount}`, 138);
      }

      for (let i = 0; i < badges.length; i++) {
        let badge = await Jimp.read(badgePath + badges[i].image);
        // card.blit(badge.resize(48, 48), 10 + (58 * (i % 5)), rankOffset + (58 * Math.floor(i / 5)));
        card.blit(badge.resize(61, 61), 10 + (73 * (i % 4)), rankOffset + (73 * Math.floor(i / 4)));
      }

      card.crop(0, 0, 300, Math.min(rankOffset + 73 * Math.ceil((badges.length) / 4), 533));

      await msg.channel.send({files: [await card.getBufferAsync(Jimp.MIME_PNG)]});
    } catch(e) { u.errorHandler(e, msg); }
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

          let ldsg = msg.cliend.guilds.cache.get(Module.config.ldsg);
          let member = msg.guild.members.cache.get(discordId);
          let name, avatar;

          if (ldsg.members.cache.has(discordId)) {
            avatar = member.user.displayAvatarURL({dynamic: true});
            name = member.displayName;
          } else {
            let user = await msg.client.users.fetch(discordId);
            avatar = user.displayAvatarURL({dynamic: true});
            name = user.username;
          }

          let image = (avatar ? avatar : ("http://ldsgamers.com" + $('.member-image > img')[0].attribs.src));

          //let communityContent = `__**MEMBER SPOTLIGHT**__\nOur community is filled with amazing people. Know someone that deserves the spotlight? Nominate them here: <http://ldsg.io/nominate>\n\nThe spotlight currently shines on **<@${discordId}>**!\n\n${text} ...\n\nTo read more, go to <${memberUrl}#member-spotlight>.`;
          //msg.channel.send(communityContent, {"file": {"attachment": image}}).catch(console.error);

          embed.addField('Current Spotlight', `The spotlight currently shines on **${name}**!\n\n${text} ...\n[READ MORE](${memberUrl}#member-spotlight)`)
            .setThumbnail(image);

          msg.channel.send({embed});
        }
      } catch(e) { u.errorHandler(e, msg); }
    });
  }
});

module.exports = Module;
