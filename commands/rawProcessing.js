const Augur = require("augurbot");

const Module = new Augur.Module()
.addEvent("raw", packet => {
  // Catch raw reaction events & convert into a non-raw event if needed

  if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
  // Other conditions can be added here to reduce unnecessary message fetches

  const client = Module.handler.client;
  const channel = client.channels.get(packet.d.channel_id);
  if (channel.messages.has(packet.d.message_id)) return;

  channel.fetchMessage(packet.d.message_id).then(async (message) => {
    try {
      const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
      const reaction = message.reactions.get(emoji);

      for (const [id, react] of message.reactions) {
        react.users = await reaction.fetchUsers();
        react.count = react.users.size;
      };

      if (packet.t === 'MESSAGE_REACTION_ADD') {
        client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
      }
      if (packet.t === 'MESSAGE_REACTION_REMOVE') {
        client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
      }
    } catch(e) { Module.handler.errorHandler(e); }
  });
});

module.exports = Module;
