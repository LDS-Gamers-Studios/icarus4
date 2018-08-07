const mongoose = require("mongoose"),
  config = require("../config/config.json"),
  User = require("./User.model"),
  Server = require("./Server.model"),
  serverSettings = new Map();

mongoose.connect(config.mongo.db, config.mongo.auth);

const models = {
  server: {
    addServer: (guild) => {
      return new Promise((fulfill, reject) => {
				let newServer = new Server({
					serverId: guild.id
				});

				Server.findOneAndUpdate(
					{serverId: guild.id},
					{$set: {
						serverId: newServer.serverId,
						botspam: newServer.botspam,
						prefix: newServer.prefix,
            language: newServer.language
					}},
					{upsert: true, new: true},
					function(err, server) {
						if (err) reject(err);
						else {
              serverSettings.set(server.serverId, server);
              fulfill(server)
            };
					}
				);
			});
    },
    getSetting: (guild, setting) => {
      return new Promise((fulfill, reject) => {
        if (serverSettings.has(guild.id)) {
          fulfill(serverSettings.get(guild.id)[setting]);
        } else {
          Server.findOne({serverId: guild.id}, (e, server) => {
  					if (e) reject({ error: e });
  					else if (server) {
                serverSettings.set(server.serverId, server)
                fulfill(serverSettings.get(server.serverId)[setting]);
            } else {
              models.server.addServer(guild).then(server => {
                fulfill(server[setting]);
              }).catch(reject);
            }
  				});
        }
      });
    },
    saveSetting: (guild, setting, value) => {
      return new Promise((fulfill, reject) => {
				let updateOptions = {};
				updateOptions[setting] = value;
				Server.findOneAndUpdate(
					{serverId: guild.id},
					{$set: updateOptions},
					{upsert: true, new: true},
					(err, server) => {
						if (err) reject(err);
						else fulfill(server);
					}
				);
			});
    }
  },
  user: {
    addUser: (user) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) !== "string") user = user.id;
  			User.findOne({discordId: user}, (err, doc) => {
  				if (err) reject(err);
  				else if (doc) fulfill(doc)
          else {
						let newMember = new User({discordId: user});
						newMember.save((err, doc) => {
							if (err) reject(err);
							else fulfill(doc);
						});
  				}
  			});
      });
    },
    getUser: (user) => {
      return new Promise(function(fulfill, reject) {
				if ((typeof user) != "string") user = user.id;

				User.findOne({discordId: user}, (error, userDoc) => {
					if (error) reject(error);
					else fulfill(userDoc);
				});
			});
    },
    saveUser: (user, preference, value) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) !== "string") user = user.id;
        let updateOptions = {};
        updateOptions[setting] = value;
        User.findOneAndUpdate(
          {discordId: user},
          {$set: updateOptions},
          {upsert: true, new: true},
          (err, userDoc) => {
            if (err) reject(err);
            else fulfill(userDoc);
          }
        );
      });
    }
  }
};

module.exports = {
  server: Server,
  user: User
};
