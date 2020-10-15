const Augur = require("augurbot"),
    u = require("../utils/utils");

const Module = new Augur.Module()
    .addCommand({
        name: "meme",
        description: "Creates a meme, put an image URL for you background and then put the text you want along the bottom. Or put the image source afterwards. Who am I to judge?",
        permissions: (msg) => msg.member && msg.channel.permissionsFor(msg.member).has(["ATTACH_FILES", "EMBED_LINKS"]),
        process: (msg, suffix) => {
            //general globals from bot this was imported from
            const args = suffix.trim().split(/ +/);
            const commandName = args.shift();
            //Determine if a string is a url
            function isURL(str) {
                const urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
                const url = new RegExp(urlRegex, 'i');
                return str.length < 2083 && url.test(str);
            }

            let src = "https://i.imgflip.com/qbm81.jpg";
            let bottomText = "_";
            let topText = "_";
            args.forEach(element => {
                if (isURL(element)) {
                    src = element;
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
