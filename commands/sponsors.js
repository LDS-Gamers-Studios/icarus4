const Augur = require("augurbot"),
  u = require("../utils/utils"),
  {Collection} = require("discord.js");

const sponsorChannels = new Collection();
let proSponsor = "121783903630524419";

const Module = new Augur.Module()
.addCommand({name: "coolkids",
  description: "Add user(s) to your Pro Sponsor private channel.",
  suffix: "@user(s)",
  permissions: (msg) => msg.guild && (msg.guild.id == Module.config.ldsg) && sponsorChannels.has(msg.member.id),
  process: async (msg) => {
    u.clean(msg, 0);
    let sponsorInfo = sponsorChannels.get(msg.member.id);
    let channel = msg.guild.channels.get(sponsorInfo.channel);

    if (msg.mentions.members.size == 0) {
      msg.reply("you need to tell me who to invite to your channel!");
      return;
    }

    for (const [memberId, member] of msg.mentions.members) {
      try {
        await channel.overwritePermissions(member.id, {
          VIEW_CHANNEL: true
        }, "Pro Sponsor Invite");
        channel.send(`Welcome, ${member}!`);
      } catch(error) { u.alertError(error, msg); }
    }
  }
})
.addCommand({name: "sponsorchannel",
  description: "Set up a private channel for a Pro Sponsor.",
  suffix: "@sponsor(s)",
  info: "Creates a private channel for a Pro Sponsor, where they can invite individuals to hang out.",
  category: "Admin",
  permissions: (msg) => msg.guild && (msg.guild.id == Module.config.ldsg) && (msg.member.roles.has(Module.config.roles.management) || msg.member.roles.has("205826273639923722")),
  process: async (msg) => {
    try {
      u.clean(msg);

      if (msg.mentions.members.size == 0) {
        msg.reply("you need to tell me who to create a channel for!");
        return;
      }

      for (const [sponsorId, sponsor] of msg.mentions.members) {
        if (!sponsor.roles.has(proSponsor)) continue;
        if (sponsorChannels.has(sponsor.id)) {
          msg.reply(`${sponsor} already has a channel at ${msg.guild.channels.get(sponsorChannels.get(sponsor.id).channel)}!`).then(u.clean);
          continue;
        }

        let channel = await msg.guild.createChannel(`${sponsor.displayName}-hangout`, [
          { id: msg.client.user.id, allow: "VIEW_CHANNEL" },
          { id: Module.config.ldsg, deny: "VIEW_CHANNEL" },
          { id: sponsor.id, allow: ["VIEW_CHANNEL", "MANAGE_CHANNELS", "MANAGE_MESSAGES", "MANAGE_WEBHOOKS"] },
        ], "Sponsor Perk");

        try {
          await Module.config.sheets.get("Sponsor Channels").addRow({
            sponsorname: sponsor.displayName,
            sponsorid: sponsor.id,
            channelid: channel.id
          });
        } catch(error) { u.alertError(error, "Save Sponsor Channel Info"); }

        channel.send(`${sponsor}, welcome to your private channel! You should have some administrative abilities for this channel (including changing the name and description), as well as the ability to add people to the channel with \`!coolkids @user(s)\`. If you would like to change default permissions for users in the channel, please contact a member of Management directly.`);
      }
    } catch(e) {
      u.alertError(e, msg);
    }
  },
  permissions: (msg) => msg.guild
})
.addEvent("loadConfig", () => {
  Module.config.sheets.get("Sponsor Channels").getRows((e, rows) => {
    if (e) u.alertError(e, "Error loading sponsor channels.");
    else {
      let ldsg = Module.handler.client.guilds.get(Module.config.ldsg);
      sponsorChannels.clear();
      for (let row of rows) {
        if (!(ldsg.members.has(row.sponsorid) && ldsgmembers.get(row.sponsorid).roles.has(proSponsor))) continue;
        sponsorChannels.set(row.sponsorid, {
          sponsor: row.sponsorid,
          channel: row.channelid,
          permissions: {
            allow: row.allowedperms,
            deny: row.deniedperms
          }
        });
      }
    }
  });
});

module.exports = Module;
