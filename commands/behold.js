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
            function backgroundImage(override = randomNumber(1, 20)) {

                //console.log(override);
                switch (override) {
                    case 1: return `https://static1.srcdn.com/wordpress/wp-content/uploads/2020/05/Elmo-Flames-Meme.jpg?q=50&fit=crop&w=960&h=500`;
                    case 20: return `https://i.imgflip.com/18kirh.jpg`;
                    default: return `https://i.imgflip.com/zs91u.jpg`;
                }
            }
            let { suffix } = u.parse(msg, true);
            let yourCompiledSuffix = `${backgroundImage()} Behold! ${u.parse(msg, true)}`;
            Module.client.commands.execute("meme", msg, yourCompiledSuffix);
        }
    });
