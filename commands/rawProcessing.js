const Augur = require("augurbot"),
  Discord = require("discord.js"),
  u = require("../utils/utils");

const Module = new Augur.Module()
.addEvent("raw", async (packet) => {
  // Catch raw reaction events & convert into a non-raw event if needed

  if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
  // Other conditions can be added here to reduce unnecessary message fetches

  const client = Module.handler.client;
  const channel = client.channels.get(packet.d.channel_id);
  if (channel.messages.has(packet.d.message_id)) return;

  try {
    let message = await channel.fetchMessage(packet.d.message_id);

    try {
      const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
      let reaction = message.reactions.get(emoji);
      if (!reaction) {
        reaction = {
          count: 0,
          emoji: packet.d.emoji.id ? client.emojis.get(packet.d.emoji.id) : packet.d.emoji.name,
          me: packet.d.user_id == client.user.id,
          message: message,
          users: new Discord.Collection(),
        };
      }

      for (const [id, react] of message.reactions) {
        react.users = await react.fetchUsers();
        react.count = react.users.size;
      };

      if (packet.t === 'MESSAGE_REACTION_ADD') {
        client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
      }
      if (packet.t === 'MESSAGE_REACTION_REMOVE') {
        client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
      }
    } catch(e) { u.alertError(e, "Error in rawProcessing.js after fetching "); }
  } catch(e) {
    u.alertError(e, "Couldn't fetch message during raw event processing.");
  }

});

module.exports = Module;
