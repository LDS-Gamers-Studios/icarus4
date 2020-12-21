const Augur = require("augurbot");

const notes = new Set();

function type(msg) {
  msg.channel.startTyping();
  setTimeout((channel) => {
    channel.stopTyping();
  }, 5000, msg.channel);
}

const Module = new Augur.Module()
.addCommand({name: "takenote",
  syntax: "@user(s)",
  description: "Troll Icarus notes.",
  hidden: true,
  category: "Mod",
  permissions: (msg) => (msg.member && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: (msg) => {
    for (let [memberId, member] of msg.mentions.members) {
      notes.add(memberId);
    }
    msg.react("👌");
  }
})
.addCommand({name: "unnote",
  syntax: "@user(s)",
  description: "Untroll Icarus notes.",
  hidden: true,
  category: "Mod",
  permissions: (msg) => (msg.member && (msg.member.roles.cache.has(Module.config.roles.mod) || msg.member.roles.cache.has(Module.config.roles.management))),
  process: (msg) => {
    for (let [memberId, member] of msg.mentions.members) {
      notes.delete(memberId);
    }
    msg.react("👌");
  }
})
.addEvent("message", (msg) => {
  if (notes.has(msg.author.id) && msg.guild && msg.guild.id == Module.config.ldsg) {
    type(msg);
  }
});

module.exports = Module;
