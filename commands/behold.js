const Augur = require("augurbot"),
    u = require("../utils/utils");

const Module = new Augur.Module()
    .addCommand({
        name: "Behold",
        description: "creates a doofenshritz behold meme, with the arguments becoming your bottom text. Small chance of fire.",
        permissions: (msg) => msg.member && msg.channel.permissionsFor(msg.member).has(["ATTACH_FILES", "EMBED_LINKS"]),
        process: (msg) => {
            function randomNumber(min, max) {
                return Math.round(Math.random() * (max - min) + min);
            }
            //Roll a D20. on a 20 get a squirell. On a 1, elmo burns. anything else you get heinz
            function backgroundImage(override) {
                switch (override || randomNumber(1, 20)) {
                    case 1: return `https://static1.srcdn.com/wordpress/wp-content/uploads/2020/05/Elmo-Flames-Meme.jpg?q=50&fit=crop&w=960&h=500`;
                    case 20: return `https://i.imgflip.com/18kirh.jpg`;
                    default: return `https://i.imgflip.com/zs91u.jpg`;
                }
            }
            let { command, suffix } = u.parse(msg, true);
            let content = `${Module.config.prefix}${command} ${backgroundImage()} Behold! ${suffix}`;
            
            let fakeMsg = {
              channel: msg.channel,
              guild: msg.guild,
              member: msg.member,
              author: msg.author,
              attachments: msg.attachments,
              content: content,
              cleanContent: content
            };
            Module.client.commands.execute("meme", fakeMsg, "");
        }
    });
