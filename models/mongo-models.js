const Animation = require("./Animation.model"),
  Bank = require("./Bank.model"),
  Ign = require("./Ign.model"),
  Infraction = require("./Infraction.model"),
  Missionary = require("./Missionary.model"),
  Server = require("./Server.model"),
  Spoiler = require("./Spoiler.model"),
  Star = require("./Star.model"),
  User = require("./User.model"),
  config = require("../config/config.json"),
  mongoose = require("mongoose");

const serverSettings = new Map();

mongoose.connect(config.db.db, config.db.auth);

const models = {
  animation: {
    save: function(data) {
      return new Promise((fulfill, reject) => {
        let newAnimation = new Animation(data);
        newAnimation.save(e => {
          if (e) reject(e);
          else fulfill(data);
        });
      });
    },
    fetch: function(animationId) {
      return new Promise((fulfill, reject) => {
        Animation.findOne({animationId: animationId}, (err, animation) => {
          if (err) reject(err);
          else fulfill(animation);
        });
      });
    }
  },
  bank: {
    getBalance: function(user) {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") user = user.id;
        Bank.aggregate(
          { $match: { discordId: user}},
          { $group: { _id: null, balance: {$sum: "$value"}}},
          (err, record) => {
            if (err) reject(err);
            else if (record && (record.length > 0)) fulfill({discordId: user, balance: record[0].balance});
            else fulfill({discordId: user, balance: 0});
          }
        );
      });
    },
    getRegister: function(user) {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") user = user.id;
        Bank.find({discordId: user}, (err, register) => {
          if (err) reject(err);
          else {
            fulfill({
              discordId: user,
              balance: register.reduce((c, r) => c + r.value, 0),
              register: register
            });
          }
        });
      });
    },
    addGhostBucks: function(data) {
      return new Promise((fulfill, reject) => {
        let record = new Bank({
          discordId: data.discordId,
          description: data.description,
          value: data.value,
          mod: data.mod
        });

        record.save((err, deposit) => {
          if (err) reject(err);
          else fulfill(deposit);
        });
      });
    }
  },
  ign: {
    delete: (userId, system) => {
      return new Promise((fulfill, reject) => {
        Ign.findOneAndRemove(
          { discordId: userId, system: system },
          (err, ign) => {
            if (err) reject(err);
            else fulfill(ign);
          }
        );
      });
    },
    find: (userId, system = null) => {
      return new Promise((fulfill, reject) => {
        let query = null;

        if (system && Array.isArray(system)) query = Ign.find({discordId: userId, system: {$in: system} });
        else if (system) query = Ign.findOne({discordId: userId, system: system });
        else query = Ign.find({discordId: userId});

        query.exec((err, igns) => {
          if (err) reject(err);
          else fulfill(igns);
        });
      });
    },
    getList: (system) => {
      return new Promise((fulfill, reject) => {
        Ign.find(
          {system: system},
          (err, users) => {
            if (err) reject(err);
            else fulfill(users);
          }
        );
      });
    },
    save: (userId, system, name) => {
      return new Promise((fulfill, reject) => {
        Ign.findOneAndUpdate(
          { discordId: userId, system: system },
          { $set: { ign: name } },
          { upsert: true, new: true },
          (err, ign) => {
            if (err) reject(err);
            else fulfill(ign);
          }
        );
      });
    }
  },
  infraction: {
    getSummary: (userId, time = 28) => {
      return new Promise((fulfill, reject) => {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        Infraction.find({discordId: userId, timestamp: { $gte: since }}, (err, records) => {
          if (err) {
            reject(err);
          } else {
            fulfill({
              userId: userId,
              count: records.length,
              points: records.reduce((c, r) => c + r.value, 0),
              time: time,
              detail: records
            });
          }
        });
      });
    },
    save: (data) => {
      return new Promise((fulfill, reject) => {
        let record = new Infraction({
          discordId: data.userId,
          channel: data.channel,
          message: data.message,
          flag: data.flag,
          value: data.value,
          description: data.description,
          mod: data.mod
        });

        record.save((err, inf) => {
          if (err) reject(err);
          else fulfill(inf);
        });
      });
    },
    update: (id, data) => {
      return new Promise((fulfill, reject) => {
        Infraction.findByIdAndUpdate(id, data, {new: true}, (err, doc) => {
          if (err) reject(err);
          else fulfill(doc);
        });
      });
    }
  },
  mission: {
    save: function(data) {
      return new Promise((fulfill, reject) => {
        Missionary.findOneAndUpdate(
          { discordId: data.discordId },
          { $set: data },
          { upsert: true, new: true },
          function(err, mission) {
            if (err) reject(err);
            else fulfill(mission);
          }
        );
      });
    },
    findEmail: function(email) {
      return new Promise((fulfill, reject) => {
        Missionary.findOne({ email: email }, (err, missionary) => {
          if (err) reject(err);
          else fulfill(missionary);
        });
      });
    },
    delete: function(discordId) {
      return new Promise((fulfill, reject) => {
        Missionary.findOneAndRemove(
          { discordId: discordId },
          function(err, missionary) {
            if (err) reject(err);
            else fulfill(missionary);
          }
        );
      });
    },
    findAll: function() {
      return new Promise((fulfill, reject) => {
        Missionary.find(
          {}, function(err, missionaries) {
            if (err) reject(err);
            else fulfill(missionaries);
          }
        );
      });
    }
  },
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
      if (serverSettings.has(guild.id)) return serverSettings.get(guild.id)[setting];
      else {
        models.server.addServer(guild);
        return null;
      }
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
  spoiler: {
    save: function(data) {
      return new Promise((fulfill, reject) => {
        let newSpoiler = new Spoiler(data);
        newSpoiler.save(e => {
          if (e) reject(e);
          else fulfill(data);
        });
      });
    },
    fetchAll: function(time = 14) {
      return new Promise((fulfill, reject) => {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        Spoiler.find({timestamp: { $gte: since }}, (err, records) => {
          if (err) reject(err);
          else fulfill(records);
        });
      });
    },
    fetch: function(spoilerId) {
      return new Promise((fulfill, reject) => {
        Spoiler.findOne({spoilerId: spoilerId}, (e, spoiler) => {
          if (e) reject(e);
          else fulfill(spoiler);
        });
      });
    }
  },
  starboard: {
    denyStar: (starboard) => {
      if (typeof starboard == "string") starboard = {id: starboard};
      return new Promise((fulfill, reject) => {
        Star.findOneAndUpdate({starId: starboard.id}, {deny: true}, (err, doc) => {
          if (err) reject(err);
          else fulfill(doc);
        });
      });
    },
    fetchStar: (messageId) => {
      return new Promise((fulfill, reject) => {
        Star.findOne({messageId: messageId}, (e, star) => {
          if (e) reject(e);
          else fulfill(star);
        });
      });
    },
    saveStar: (message, starboard) => {
      return new Promise((fulfill, reject) => {
        let newStar = new Star({
          author: message.author.id,
          messageId: message.id,
          channelId: message.channel.id,
          starId: starboard.id,
          deny: false,
          timestamp: message.createdAt
        });
        newStar.save((e, star) => {
          if (e) reject (e);
          else fulfill(star);
        });
      });
    }
  },
  user: {
    addGhostBucks: (user, bucks) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") user = user.id;
        User.findOneAndUpdate(
          { discordId: user },
          { $inc: { ghostBucks: bucks } },
          { new: true },
          (err, newUser) => {
            if (err) reject(err);
            else fulfill(newUser);
          }
        );
      });
    },
    addStars: (stars) => {
      return new Promise((fulfill, reject) => {
        let updates = [];
        for (var x in stars) {
          updates.push(new Promise((f, r) => {
            User.findOneAndUpdate(
              { discordId: x },
              { $inc: { stars: stars[x] } },
              { new: true },
              (err, newUser) => {
                if (err) r(err);
                else f(newUser);
              }
            );
          }));
        }

        Promise.all(updates).then(responses => {
          fulfill(true);
        }).catch(reject);
      });
    },
    addXp: (users) => {
      return new Promise((fulfill, reject) => {
        let xp = Math.floor(Math.random() * 11) + 15;
        let response = { users: [], xp: xp };
        if (users.length > 0) {
          User.find(
            { discordId: {$in: users} },
            (e, users) => {
              if (e) reject(e);
              else if (users) {
                let updates = users.map(user => {
                  return new Promise((fulfill, reject) => {
                    User.findOneAndUpdate(
                      { discordId: user.discordId },
                      { $inc: { currentXP: xp, totalXP: xp, posts: 1 } },
                      { new: true, upsert: true },
                      (err, newUser) => {
                        if (err) reject(err);
                        else fulfill(newUser);
                      }
                    );
                  });
                });
                Promise.all(updates).then(responses => {
                  response.users = responses;
                  fulfill(response);
                }).catch(reject);
              } else fulfill(response);
            }
          );
        } else fulfill(response);
      });
    },
    fetchCurrentRankings: (limit = 50, page = 1) => {
      return new Promise((fulfill, reject) => {
        User.find()
          .sort({currentXP: -1, totalXP: -1})
          .skip(limit * (page - 1))
          .limit(limit)
          .exec((err, docs) => {
            if (err && (Object.keys(err).length > 0)) reject(err);
            else fulfill(docs);
          });
      });
    },
    fetchLifetimeRankings: (limit = 50, page = 1) => {
      return new Promise((fulfill, reject) => {
        User.find()
          .sort({totalXP: -1, currentXP: -1})
          .skip(limit * (page - 1))
          .limit(limit)
          .exec((err, docs) => {
            if (err && (Object.keys(err).length > 0)) reject(err);
            else fulfill(docs);
          });
      });
    },
    fetchStarRankings: (limit = 50, page = 1) => {
      return new Promise((fulfill, reject) => {
        User.find({stars: {$gt: 0}, posts: {$gt: 0}})
          .sort({totalXP: -1, currentXP: -1})
          .exec((err, docs) => {
            if (err && (Object.keys(err).length > 0)) reject(err);
            else {
              docs = docs.map(u => { u.quality = Math.floor(1000 * u.stars / u.posts); return u; }).sort((a, b) => { return ((b.stars / b.posts) - (a.stars / a.posts)); });
              fulfill(docs);
            }
          });
      });
    },
    fetchUser: (user) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") user = user.id;

        User.findOne({discordId: user}, (error, userDoc) => {
          if (error) reject(error);
          else fulfill(userDoc);
        });
      });
    },
    findLifetimeRank: (user) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") user = user.id;

        User.findOne({discordId: user}, (error, userDoc) => {
          if (error) reject(error);
          else {
            User.count({"$or": [{totalXP: {"$gt": userDoc.totalXP}}, {totalXP: userDoc.totalXP, currentXP: {"$gt": userDoc.currentXP}}]}, (e, userRank) => {
              if (e) reject(e);
              else {
                userDoc.rank = userRank + 1;
                fulfill(userDoc);
              }
            });
          }
        });
      });
    },
    findXPRank: (user) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") user = user.id;

        User.findOne({discordId: user}, (error, userDoc) => {
          if (error) reject(error);
          else {
            User.count({"$or": [{currentXP: {"$gt": userDoc.currentXP}}, {currentXP: userDoc.currentXP, totalXP: {"$gt": userDoc.totalXP}}]}, (e, currentRank) => {
              if (e) reject(e);
              else {
                userDoc.currentRank = currentRank + 1;

                User.count({"$or": [{totalXP: {"$gt": userDoc.totalXP}}, {totalXP: userDoc.totalXP, currentXP: {"$gt": userDoc.currentXP}}]}, (e, lifeRank) => {
                  if (e) reject(e);
                  else {
                    userDoc.lifeRank = lifeRank + 1;
                    fulfill(userDoc);
                  }
                });
              }
            });
          }
        });
      });
    },
    newUser: (user) => {
      if ((typeof user) != "string") user = user.id;
      User.findOne({discordId: user}, (err, doc) => {
        if (err) console.error(err);
        else if (!doc) {
          let newMember = new User({
            discordId: user,
            currentXP: 0,
            totalXP: 0,
            preferences: 0,
            ghostBucks: 0,
            house: null
          });
          newMember.save((err, doc) => {
            if (err) console.error(err);
            else console.log("New Member Saved: " + doc.discordId);
          });
        }
      });
    },
    updateRoles: (member) => {
      return new Promise((fulfill, reject) => {
        User.findOne({discordId: member.id}, (err, user) => {
          if (user) {
            user.set({roles: Array.from(member.roles.keys())});
            user.save((err, newUser) => {
              if (err) reject(err);
              else fulfill(newUser);
            });
          }
        });
      });
    }
  },
  init: (Handler) => {
    Handler.bot.guilds.forEach(guild => {
      Server.findOne({serverId: guild.id}, (e, server) => {
        if (!e && server) {
          serverSettings.set(server.serverId, server);
        } else {
          models.server.addServer(guild).then(server => {
            serverSettings.set(server.serverId, server);
          });
        }
      });
    });
  }
};

module.exports = models;
