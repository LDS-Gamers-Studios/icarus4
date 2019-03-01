const badges = new Map()
  .set("114499378936283143", {title: "LDSG Founder", image: "team_founder.png", overrides: ["96360253850935296", "96345401078087680", "114492841367044098"]})
  .set("96360253850935296", {title: "LDSG Management", image: "team_management.png", overrides: ["96345401078087680", "114492841367044098"]})
  .set("96345401078087680", {title: "LDSG Team", image: "team_team.png", overrides: ["114492841367044098"]})
  .set("114492841367044098", {title: "LDSG Gameskeeper", image: "team_gameskeeper.png"})
  .set("114490059452841985", {title: "LDSG Minecraft Mod", image: "team_minecraft.png", desc: "A moderator on the LDSG Minecraft Servers"})

  .set("318427374309998592", {title: "LDSG Tournament Champion", image: "tourney_champ.png"})

  .set("121783903630524419", {title: "Pro Sponsor", image: "sponsor_pro.png", desc: "Your generous donation lets us know you care about the community. You have our sincerest thanks, you awesome person, you.", overrides: ["121783798647095297", "114816596341424129", "338056125062578176", "114817401614368775"]})
  .set("121783798647095297", {title: "Onyx Sponsor", image: "sponsor_onyx.png", desc: "Your generous donation lets us know you care about the community. You have our sincerest thanks, you awesome person, you.", overrides: ["114816596341424129", "338056125062578176", "114817401614368775"]})
  .set("114816596341424129", {title: "Elite Sponsor", image: "sponsor_elite.png", desc: "Your generous donation lets us know you care about the community. You have our sincerest thanks, you awesome person, you.", overrides: ["338056125062578176", "114817401614368775"]})
  .set("338056125062578176", {title: "Twitch Subscriber", image: "sponsor_twitch.png", desc: "Your generous donation lets us know you care about the community. You have our sincerest thanks, you awesome person, you.", overrides: ["114817401614368775"]})
  .set("114817401614368775", {title: "Donator", image: "sponsor_donator.png", desc: "Your generous donation lets us know you care about the community. You have our sincerest thanks, you awesome person, you."})

  .set("202936368362422275", {title: "Ancient Member", image: "chat_ancient.png", desc: "Attained the rank of Ancient in the LDSG Discord Server for participation in conversations.", overrides: ["202935996164079617", "202936107472650240", "202935950119010304", "203208457363390464"]})
  .set("202935996164079617", {title: "Legendary Member", image: "chat_legend.png", desc: "Attained the rank of Legend in the LDSG Discord Server for participation in conversations.", overrides: ["202936107472650240", "202935950119010304", "203208457363390464"]})
  .set("202936107472650240", {title: "Hero Member", image: "chat_hero.png", desc: "Attained the rank of Hero in the LDSG Discord Server for participation in conversations.", overrides: ["202935950119010304", "203208457363390464"]})
  .set("202935950119010304", {title: "Veteran Member", image: "chat_veteran.png", desc: "Attained the rank of Veteran in the LDSG Discord Server for participation in conversations.", overrides: ["203208457363390464"]})
  .set("203208457363390464", {title: "Novice Member", image: "chat_novice.png", desc: "Attained the rank of Novice in the LDSG Discord Server for participation in conversations."})

  .set("281709365856043008", {title: "PC Gamer", image: "platform_pc.png", desc: "You are a PC Gamer. The Master Race. Half Life 3 Confirmed."})
  .set("281709298256576512", {title: "Xbox Gamer", image: "platform_xb.png", desc: "You are an Xbox Gamer."})
  .set("281709339843100673", {title: "Playstation Gamer", image: "platform_ps.png", desc: "You game on the Playstation."})
  .set("281709384139276288", {title: "Nintendo Gamer", image: "platform_nin.png", desc: "You game on the Nintendo."})

  .set("375047444599275543", {title: "Member - 1 Year", image: "anniversary-1.png", desc: "A member of the LDS Gamers Discord Community for 1 Year!"})
  .set("375047691253579787", {title: "Member - 2 Years", image: "anniversary-2.png", desc: "A member of the LDS Gamers Discord Community for 2 Years!", overrides: ["375047444599275543"]})
  .set("375047792487432192", {title: "Member - 3 Years", image: "anniversary-3.png", desc: "A member of the LDS Gamers Discord Community for 3 Years!", overrides: ["375047444599275543", "375047691253579787"]});

module.exports = function(roles) {
  let overrides = [];
  let userBadges = [];
  Array.from(roles.values()).sort((a, b) => { return b.position - a.position; }).forEach(role => {
    if (!overrides.includes(role.id) && badges.has(role.id) && (userBadges.length < 10)) {
      userBadges.push({ name: role.name, image: badges.get(role.id).image, title: (badges.get(role.id).desc ? badges.get(role.id).desc : badges.get(role.id).title) });
      if (badges.get(role.id).overrides) badges.get(role.id).overrides.forEach(override => { overrides.push(override); });
    }
  });
  return userBadges;
};
