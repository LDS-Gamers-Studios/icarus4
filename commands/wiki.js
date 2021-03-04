const Augur = require("augurbot");

const Module = new Augur.Module()
.addCommand({
  name: "wiki",
  description: "Search the LDSG Wiki for a term.",
  syntax: "Term",
  permissions: (msg) => (!msg.guild || (msg.channel.permissionsFor(msg.member).has(["EMBED_LINKS", "ATTACH_FILES"]) && msg.channel.permissionsFor(msg.client.user).has("ATTACH_FILES"))),
  process: async (msg, suffix) => {
    
  }
});

module.exports = Module;