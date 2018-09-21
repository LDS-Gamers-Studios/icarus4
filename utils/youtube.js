const request = require("request");
const userToChannelId = new Map();
var key;

function yt(api_key) {
  if (api_key) key = api_key;

  this.fetchChannelId = function(username) {
    if (userToChannelId.has(username.toLowerCase())) {
      return Promise.resolve(userToChannelId.get(username.toLowerCase()));
    } else {
      return new Promise((fulfill, reject) => {
        let url = "https://www.googleapis.com/youtube/v3/channels?";
        let options = {
          part: "id,snippet",
          forUsername: username,
          key: key
        };
        url += Object.keys(options).map(k => `${k}=${options[k]}`).join("&");
        request(url, (error, response, body) => {
          if (error) reject(error);
          else {
            body = JSON.parse(body);
            if (body.items && body.items[0]) {
              userToChannelId.set(username.toLowerCase(), body.items[0]);
              fulfill(body.items[0]);
            } else fulfill(null);
          }
        });
      });
    }
  };

  this.fetchChannelContent = function(channelId, eventType = null) {
    return new Promise((fulfill, reject) => {
      let url = "https://www.googleapis.com/youtube/v3/search?";
      let options = {
        part: 'snippet',
        channelId: channelId,
        order: 'date',
        type: 'video',
        key: key
      };
      if (eventType) options.eventType = eventType;
      url += Object.keys(options).map(k => `${k}=${options[k]}`).join("&");
      request(url, (error, response, body) => {
        if (error) reject(error);
        else {
          body = JSON.parse(body);
          fulfill(body.items);
        }
      });
    });
  }

  this.fetchUserContent = function(username) {
    return new Promise((fulfill, reject) => {
      fetchChannelId(username).then(channel => {
        if (channel) {
          fetchChannelContent(channel.id).then(content => {
            fulfill({channel, content});
          }).catch(reject);
        } else {
          fulfill(null);
        }
      }).catch(reject);
    });
  };

  return this;
}

module.exports = yt;
