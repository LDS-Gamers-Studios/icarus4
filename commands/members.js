const Augur = require("augurbot"),
  request = require("request"),
  cheerio = require("cheerio"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addCommand({name: "info",
  description: "Check when a user joined the server",
  syntax: "[@user]",
  category: "Members",
  process: (msg, suffix) => {
    let users = [msg.author];
    let mentions = u.userMentions(msg);
    if (mentions) {
      if (mentions.length > 4) msg.channel.send("Limit of 4 users at once").then(u.clean).catch(console.error);
      users = [];
      mentions.forEach(mention => {
        users.push({id: mention});
      });
    } else if (suffix) {
      if (users.length > 4) { msg.channel.send("Limit of 4 users at once").then(u.clean).catch(console.error); return; }
      users = suffix.split(/ ?\| ?/);
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
.addCommand({name: "members",
  description: "How many members are in LDSG?",
  category: "Members",
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

    request(memberUrl, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        let $ = cheerio.load(body);
        let name = $('.member-content > h2')[0].children[0].data;
        let discordId = $('.member-content > h2')[0].attribs["data-discordid"];
        let text = $('.featured-member-content > p:first-of-type')[0].children[0].data;

        let embed = new Discord.RichEmbed()
          .setTitle("MEMBER SPOTLIGHT")
          .setColor(config.color)
          .setURL(`${memberUrl}#member-spotlight`)
          .setDescription('Our community is filled with amazing people. Know someone that deserves the spotlight? Nominate them by sending CJ Stormblessed a message!');

        if (msg.guild && (msg.guild.id == '96335850576556032')) {
          msg.guild.fetchMember(discordId).then((discordUser) => {

            let avatar = (discordUser ? discordUser.user.avatarURL : null);
            let image = (avatar)?(avatar):("http://ldsgamers.com" + $('.member-image > img')[0].attribs.src);

            //let communityContent = `__**MEMBER SPOTLIGHT**__\nOur community is filled with amazing people. Know someone that deserves the spotlight? Nominate them here: <http://ldsg.io/nominate>\n\nThe spotlight currently shines on **<@${discordId}>**!\n\n${text} ...\n\nTo read more, go to <${memberUrl}#member-spotlight>.`;
            //msg.channel.send(communityContent, {"file": {"attachment": image}}).catch(console.error);

            embed.addField('Current Spotlight', `The spotlight currently shines on **${discordUser.displayName}**!\n\n${text} ...\n[READ MORE](${memberUrl}#member-spotlight)`)
              .setThumbnail(image);

            msg.channel.send({embed: embed});
          }).catch(console.error);
        } else {
          bot.fetchUser(discordId).then((discordUser) => {
            let avatar = (discordUser ? discordUser.avatarURL : null);
            let image = (avatar)?(avatar):("http://ldsgamers.com" + $('.member-image > img')[0].attribs.src);

            embed.addField('Current Spotlight', `The spotlight currently shines on **${discordUser.username}**!\n\n${text} ...\n[READ MORE](${memberUrl}#member-spotlight)`)
              .setThumbnail(image);

            msg.channel.send({embed: embed});
          }).catch(console.error);
        }
      }
    });
  }
});

module.exports = Module;
