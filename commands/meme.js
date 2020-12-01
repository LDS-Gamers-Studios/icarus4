const Augur = require("augurbot"),
    u = require("../utils/utils");

const Module = new Augur.Module()
   .addCommand({
        name: "meme",
        aliases: ["doofinshmirtz"],
        description: "Creates a meme, put an image URL for you background and then put the text you want along the bottom. Or put the image source afterwards. Who am I to judge?",
        permissions: (msg) => msg.channel.id == "121755900313731074" && msg.channel.permissionsFor(msg.member).has(["ATTACH_FILES", "EMBED_LINKS"]),
        process: (msg) => {
            let {suffix} = u.parse(msg, true);
            //general globals from bot this was imported from
            const 😁 = suffix.trim().split(/ +/);
            //Determine if a string is a url
            function isURL(str) {
              // Sloppy, but does the trick.
              const 📶 = /^<?(https?:\/\/\S*?)>?$/;
              const ✅ = 📶.exec(str);
              return ✅ ? ✅[1] : null;
            }

            let 📩 = msg.attachments.size > 0 ? msg.attachments.first().url : null;
            let 🔽 = [];
            let 🔝 = [];
            for (const arg of 😁) {
              let 📶 = isURL(arg);
              if (!📩 && 📶) {
                📩 = 📶;
              } else if (arg.toLowerCase() == "-t" || arg.toLowerCase() == "\n") {
                🔝 = 🔽;
                🔽 = [];
              } else {
                🔽.push(arg);
              }
            }

            if (!📩) 📩 = "https://i.imgflip.com/qbm81.jpg";
            🔽 = encodeURIComponent(🔽.join(" ").replace(/\-/g, " -"));
            🔝 = encodeURIComponent(🔝.join(" ").replace(/\-/g, " -"));
            📩 = encodeURIComponent(📩.trim());
            let 🎪 = `https://api.memegen.link/images/custom/${🔝 || "_"}/${🔽 || "_"}.png?background=${📩}`;

            msg.channel.send({ files: [🎪] });
        },
    }).addCommand({
        name: "behold",
        description: "creates a doofenshritz behold meme, with the arguments becoming your bottom text. Small chance of fire.",
        permissions: (msg) => msg.channel.id == "121755900313731074" && msg.channel.permissionsFor(msg.member).has(["ATTACH_FILES", "EMBED_LINKS"]),
        process: (msg) => {
            function randomNumber(min, max) {
                let high = Math.max(max, min);
                let low = Math.min(max, min);
                return Math.floor(Math.random() * (high - low + 1)) + low;
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
            let content = `${Module.config.prefix}${command} ${backgroundImage()} Behold! -t ${suffix}`;

            let fakeMsg = {
              channel: msg.channel,
              guild: msg.guild,
              member: msg.member,
              author: msg.author,
              attachments: msg.attachments,
              content: content,
              client: msg.client,
              cleanContent: content
            };
            Module.client.commands.execute("meme", fakeMsg, content);
        }
    });;
module.exports = Module;
