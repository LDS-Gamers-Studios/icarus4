const Augur = require("augurbot"),
  u = require("../utils/utils");

const approvalQueue = "759065489598054450";
const THRESHOLD = 8;

const starBoards = new u.Collection()
.set("750756030966661135", { // #best-of-modlogs
  board: "750756030966661135",
  channels: [
    "800827468315492352", // LDSG Team
    "363020585988653057"  // LDSG Discord Mods
  ]
})
.set("759065426029707305", { // #star-board *
  board: "759065426029707305",
  confirm: "⭐"
})
.set("809436054960603196", { // #adulting
  board: "809436054960603196",
  channels: [
    "809291369742991400", // #adult
    "120618385452040195"  // #married
  ]
})
.set("762681231879045171", { // #aww
  board: "762681231879045171",
  emoji: ["💖"],
  confirm: "💖"
})
.set("730435938072789033", { // #the-gallery *
  board: "730435938072789033",
  emoji: ["🖌️", "🎵"],
  channels: [
    "266989293455540224", // #creative
    "689672254430511206", // #musicians
    "544360918495264798"  // #3d-printing
  ],
  confirm: "🖌️"
})
.set("762681097162457128", { // #hype-reel
  board: "762681097162457128",
  emoji: ["🎥"],
  channels: [
    "737557773000245298"
  ],
  confirm: "🎥"
})
.set("809436205476478996", { // #just-brightbeam-stuff
  board: "809436205476478996",
  channels: [
    "762505119710969946", // #brightbeam-commons
    "801527229372825621", // #brightbeam-rp
    "804536778597859358"  // #brightbeam-vc-text
  ]
})
.set("809436300154896396", { // #just-freshbeast-stuff
  board: "809436300154896396",
  channels: [
    "762505078531293205", // #freshbeast-commons,
    "799335542893314069"  // #freshbeast-rp
  ]
})
.set("809436370367021066", { // #just-starcamp-stuff
  board: "809436370367021066",
  channels: [
    "762505045089452073"  // #starcamp-commons
  ]
})
.set("730435722699472896", { // #made-me-laugh *
  board: "730435722699472896",
  emoji: ["😆", "🤣", "😂", "ghostlaugh"],
  channels: [
    "121755900313731074" // #gifs-and-memes
  ],
  confirm: "😆"
})
.set("760589583942942760", { // #uplifted *
  board: "760589583942942760",
  emoji: ["😇"],
  channels: [
    "469239420621422592", // #fireside
    "363016072200454146"  // Gospel
  ],
  confirm: "😇"
});

async function checkStarBoard(reaction, user) {
  try {
    if (reaction.message?.partial !== false)
      reaction.message = await reaction.message.fetch().catch(u.noop);
    if (reaction.partial)
      reaction = await reaction.fetch().catch(u.noop);

    const msg = reaction?.message;
    if (!user.bot && msg?.guild?.id == Module.config.ldsg && (msg?.createdTimestamp > (Date.now() - 7 * 24 * 60 * 60000))) {
      // Only respond to recent messages from LDSG
      let react = reaction.emoji.name;

      if (!msg.author.bot && (reaction.count == THRESHOLD) && (msg.channel.parentID != "730435569330421830") && !msg.channel.name.toLowerCase().includes("spoiler")) {
        // Process initial star
        if (await Module.db.starboard.fetchMessage(msg.id)) return; // Already starred. Don't do it again
        let posted;
        let embed = starEmbed(reaction);
        if (msg.attachments && (msg.attachments.size > 0))
          embed.setImage(msg.attachments.first().url);
        try { // Post in applicable star board
          // Post to channel default, regardless of emoji
          for (const [board, defaults] of starBoards) {
            if (defaults.channels?.includes(msg.channel.id) || defaults.channels?.includes(msg.channel.parentID)) {
              posted = await msg.guild.channels.cache.get(board).send({embed});
              await Module.db.starboard.saveStar(msg, posted);
              break;
            }
          }
          // Post to emoji default
          if (!posted) {
            for (const [board, defaults] of starBoards) {
              if (defaults.emoji?.includes(react)) {
                posted = await msg.guild.channels.cache.get(board).send({embed});
                await Module.db.starboard.saveStar(msg, posted);
                break;
              }
            }
          }
        } catch(error) { u.errorHandler(error, "Post Star to Default Board"); }

        try { // No defaults, post to approval queue
          if (!posted && (react == "⭐")) {
            posted = await msg.guild.channels.cache.get(approvalQueue).send({embed});
            await Module.db.starboard.saveStar(msg, posted);
            for (const [board, defaults] of starBoards) {
              if (defaults.confirm)
                await posted.react(defaults.confirm);
            }
            await posted.react("🚫");
          }
        } catch(error) { u.errorHandler(error, "Post Star to Approval Queue"); }
      } else if ((msg.channel.id == approvalQueue) && (msg.author.id == msg.client.user.id)) {
        // Confirm from #approval-queue
        try {
          let star = await Module.db.starboard.fetchStar(msg.id);
          let board = starBoards.find(b => b.confirm == react);
          if (star && !star.deny && board) {
            let embed = u.embed(msg.embeds[0]).setTimestamp(star.timestamp);
            let posted = await msg.guild.channels.cache.get(board.board).send({embed});
            await Module.db.starboard.approveStar(msg, posted);
            embed.setColor(0x00ff00);
            await msg.edit({embed});
            await msg.reactions.removeAll();
          } else if (star && react == "🚫") {
            let embed = u.embed(msg.embeds[0]).setTimestamp(star.timestamp).setColor(0xff0000);
            await Module.db.starboard.denyStar(star.starId);
            await msg.edit({embed});
            await msg.reactions.removeAll();
          }
        } catch(error) { u.errorHandler(error, "Approve Star"); }
      }
    }
    if (reaction.emoji.name == "🗒️") user.send(starEmbed(reaction)).catch(u.noop);
  } catch(error) { u.errorHandler(error, "Star Board Update"); }
}

function starEmbed(reaction) {
  const msg = reaction.message;
  const react = reaction.emoji.name;
  return (u.embed()
    .setAuthor(msg.member?.displayName || msg.author?.username || "🤷", msg.author?.displayAvatarURL())
    .setTimestamp(msg.createdAt)
    .setDescription(msg.cleanContent)
    .addField("Channel", msg.channel?.toString() || "🤷", true)
    .addField("Jump to Post", `[Original Message](${msg.url})`, true)
    .setFooter(react));
}

const Module = new Augur.Module()
.addEvent("messageReactionAdd", checkStarBoard);

module.exports = Module;
