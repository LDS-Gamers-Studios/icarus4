// Model system for file storage.
// DO NOT USE FOR SHARDED BOTS

const fs = require("fs"),
  path = require("path"),
  config = require("../config/config.json"),
  files = {
    servers: path.resolve(process.cwd(), "./data/servers.json"),
    users: path.resolve(process.cwd(), "./data/users.json")
  },
  userSettings = new Map(),
  serverSettings = new Map();

var serverUpdate = false,
  userUpdate = false;

function updateServerData() {
  if (serverUpdate) {
    fs.readFileSync(files.servers, (err, data) => {
      if (err) return;
      else {
        data = JSON.parse(data);
        serverSettings.forEach((server, id) => {
          data[id] = server;
        });
        fs.writeFile(files.servers, JSON.stringify(data), (err) => {
          if (err) console.error(err);
          else {
            serverUpdate = false;
            console.log("Server settings saved.");
          }
        });
      }
    });
  }
};

function updateUserData() {
  if (userUpdate) {
    fs.readFileSync(files.users, (err, data) => {
      if (err) return;
      else {
        data = JSON.parse(data);
        userSettings.forEach((user, id) => {
          data[id] = user;
        });
        fs.writeFile(files.users, JSON.stringify(data), (err) => {
          if (err) console.error(err);
          else {
            userUpdate = false;
            console.log("User settings saved.");
          }
        });
      }
    });
  }
};

// Safe save for filesystem settings.
setTimeout(() => {
  updateServerData();
  updateUserData();
}, 60000);

const models = {
  server: {
    addServer: (guild) => {
      return new Promise((fulfill, reject) => {
        if (serverSettings.has(guild.id)) fulfill(serverSettings.get(guild.id));
        else {
          fs.readFile(files.servers, (err, data) => {
            if (err) reject(err);
            else {
              data = JSON.parse(data);
              if (data[guild.id]) {
                serverSettings.set(guild.id, data[guild.id]);
                fulfill(serverSettings.get(guild.id));
              } else {
                let defaultSettings = {
                  serverId: guild.id,
                  prefix: config.prefix,
                  botspam: null,
                  language: config.language
                };
                serverSettings.set(guild.id, defaultSettings);
                serverUpdate = true;
                fulfill(serverSettings.get(guild.id));
              }
            }
          });
        }
      });
    },
    getSetting: (guild, setting) => {
      return new Promise((fulfill, reject) => {
        if (serverSettings.has(guild.id)) {
          fulfill(serverSettings.get(guild.id)[setting]);
        } else {
          fs.readFile(files.servers, (err, data) => {
            if (err) reject(err);
            else {
              data = JSON.parse(data);
              if (data[guild.id]) {
                serverSettings.set(guild.id, data[guild.id]);
                fulfill(data[guild.id][setting]);
              } else {
                let defaultSettings = {
                  serverId: guild.id,
                  prefix: config.prefix,
                  botspam: null,
                  language: config.language
                };
                serverSettings.set(guild.id, defaultSettings);
                serverUpdate = true;
                fulfill(defaultSettings[setting]);
              }
            }
          });
        }
      });
    },
    saveSetting: (guild, setting, value) => {
      return new Promise((fulfill, reject) => {
        if (serverSettings.has(guild.id)) {
          serverSettings.get(guild.id)[setting] = value;
          serverUpdate = true;
          fulfill(serverSettings.get(guild.id));
        } else {
          fs.readFile(files.servers, (err, data) => {
            if (err) reject(err);
            else {
              data = JSON.parse(data);
              if (data[guild.id]) {
                data[guild.id][setting] = value;
                serverSettings.set(guild.id, data[guild.id]);
                serverUpdate = true;
                fulfill(serverSettings.get(guild.id));
              } else {
                let defaultSettings = {
                  serverId: guild.id,
                  prefix: config.prefix,
                  botspam: null,
                  language: config.language
                };
                defaultSettings[setting] = value;
                serverSettings.set(guild.id, defaultSettings);
                serverUpdate = true;
                fulfill(serverSettings.get(guild.id));
              }
            }
          });
        }
      });
    }
  },
  user: {
    addUser: (user) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) !== "string") user = user.id;
        if (userSettings.has(user)) fulfill(userSettings.get(user));
        else {
          fs.readFile(files.users, (err, data) => {
            if (err) reject(err);
            else {
              data = JSON.parse(data);
              if (data[user]) {
                userSettings.set(user, data[user]);
                fulfill(userSettings.get(user));
              } else {
                let defaultSettings = {
                  discordId: user,
                  language: config.language
                };
                userSettings.set(user, defaultSettings);
                userUpdate = true;
                fulfill(userSettings.get(user));
              }
            }
          });
        }
      });
    },
    getUser: (user) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) !== "string") user = user.id;
        if (userSettings.has(user)) fulfill(userSettings.get(user));
        else {
          fs.readFile(files.users, (err, data) => {
            if (err) reject(err);
            else {
              data = JSON.parse(data);
              if (data[user]) {
                userSettings.set(user, data[user]);
                fulfill(userSettings.get(user));
              } else {
                let defaultSettings = {
                  discordId: user,
                  language: config.language
                };
                userSettings.set(user, defaultSettings);
                userUpdate = true;
                fulfill(userSettings.get(user));
              }
            }
          });
        }
      });
    },
    saveUser: (user, preference, value) => {
      if ((typeof user) !== "string") user = user.id;
      return new Promise((fulfill, reject) => {
        models.user.getUser(user).then(userInfo => {
          userInfo[preference] = value;
          userSettings.set(userInfo.discordId, userInfo);
          userUpdate = true;
        }).catch(reject);
      })
    }
  }
}

module.exports = models;
