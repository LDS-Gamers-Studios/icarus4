const Augur = require("augurbot"),
    u = require("../utils/utils");

const Module = new Augur.Module()
    .addCommand({
        name: "meme",
        description: "Creates a meme, put an image URL for you background and then put the text you want along the bottom. Or put the image source afterwards. Who am I to judge?",
        permissions: (msg) => msg.member && msg.channel.permissionsFor(msg.member).has(["ATTACH_FILES", "EMBED_LINKS"]),
        process: (msg) => {
            let {suffix} = u.parse(msg, true);
            //general globals from bot this was imported from
            const args = suffix.trim().split(/ +/);
            //Determine if a string is a url
            function isURL(str) {
              // Sloppy, but does the trick.
              const url = /^<?(https?:\/\/\S*?)>?$/;
              const match = url.exec(str);
              return match ? match[1] : null;
            }

            let src = "https://i.imgflip.com/qbm81.jpg";
            let bottomText = "_";
            let topText = "_";
            args.forEach(element => {
                let url = isURL(element);
                if (url) {
                    src = url;
                }
                else if (element.toLowerCase() != "-t") {
                    bottomText = bottomText.concat(element + " ");
                }
                else {
                    topText = bottomText;
                    bottomText = "_";
                }
            });
            bottomText = encodeURIComponent(bottomText.trim());
            topText = encodeURIComponent(topText.trim());
            src = encodeURIComponent(src.trim());
            let meme = `https://api.memegen.link/images/custom/${topText}/${bottomText}.png?background=${src}`;

            msg.channel.send({ files: [meme] });
        },
    });
module.exports = Module;
