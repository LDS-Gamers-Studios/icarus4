const Animation = require("./Animation.model"),
  Ankle = require("./Ankle.model"),
  Bank = require("./Bank.model"),
  Ign = require("./Ign.model"),
  Infraction = require("./Infraction.model"),
  Missionary = require("./Missionary.model"),
  Remind = require("./Remind.model"),
  Server = require("./Server.model"),
  Spoiler = require("./Spoiler.model"),
  Star = require("./Star.model"),
  Tag = require("./Tag.model"),
  User = require("./User.model"),
  config = require("../config/config.json"),
  mongoose = require("mongoose");

const serverSettings = new Map(),
  {Collection} = require("discord.js");

mongoose.connect(config.db.db, config.db.settings);

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
    },
    fetchAll: function(time = 14) {
      return new Promise((fulfill, reject) => {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        Animation.find({date: { $gte: since }}, (err, records) => {
          if (err) reject(err);
          else fulfill(records);
        });
      });
    }
  },
  ankle: {
    save: function(data) {
      return new Promise((fulfill, reject) => {
        let newLostAnkle = new Ankle(data);
        newLostAnkle.save(e => {
          if (e) reject(e);
          else fulfill(data);
        });
      });
    },
    getAnkles: function(time = 365) {
      return new Promise((fulfill, reject) => {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        Ankle.find({timestamp: { $gte: since }}, (err, records) => {
          if (err) reject(err);
          else fulfill(records);
        });
      });
    },
    getChannelSummary: function(channelId, time = 10000) {
      return new Promise((fulfill, reject) => {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        Ankle.find({channel: channelId, timestamp: { $gte: since }}, (err, records) => {
          if (err) {
            reject(err);
          } else {
            fulfill({
              channelId: channelId,
              perUser: records.reduce((acc, r) => {
                // Group lost ankles by user.
                // perUser attribute is an object with User IDs as keys and counts (within the channel) as values
                if (acc.has(r.discordId)) acc.set(r.discordId, acc.get(r.discordId) + 1);
                else acc.set(r.discordId, 1);
                return acc;
                }, new Collection()
              ),
              total: records.length
            });
          }
        });
      });
    },
    getUserSummary: function(userId, time = 10000) {
      return new Promise((fulfill, reject) => {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        Ankle.find({discordID: userId, timestamp: { $gte: since }}, (err, records) => {
          if (err) {
            reject(err);
          } else {
            fulfill({
              userId: userId,
              perChannel: records.reduce((acc, r) => {
                // Group lost ankles by channel.
                // perChannel attribute is an object with Channel IDs as keys and counts as values
                if (acc.has(r.channel)) acc.set(r.channel, acc.get(r.channel) + 1);
                else acc.set(r.channel, 1);
                return acc;
                }, new Collection()
              ),
              total: records.length
            });
          }
        });
      });
    },
    getSummary: function(time = 10000) {
      return new Promise((fulfill, reject) => {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        Ankle.find({timestamp: { $gte: since }}, (err, records) => {
          if (err) {
            reject(err);
          } else {
            fulfill({
              userId: userId,
              perChannel: records.reduce((acc, r) => {
                // Group lost ankles by channel.
                // perChannel attribute is an object with Channel IDs as keys and counts as values
                if (acc.has(r.channel)) acc.set(r.channel, acc.get(r.channel) + 1);
                else acc.set(r.channel, 1);
                return acc;
                }, new Collection()
              ),
              perUser: records.reduce((acc, r) => {
                // Group lost ankles by user.
                // perUser attribute is an object with User IDs as keys and counts (within the channel) as values
                if (acc.has(r.discordId)) acc.set(r.discordId, acc.get(r.discordId) + 1);
                else acc.set(r.discordId, 1);
                return acc;
                }, new Collection()
              ),
              total: records.length
            });
          }
        });
      });
    }
  },
  bank: {
    getBalance: function(user, currency = "gb") {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") user = user.id;
        Bank.aggregate(
          [
            { $match: { discordId: user, currency: currency }},
            { $group: { _id: null, balance: {$sum: "$value"}}}
          ],
          (err, record) => {
            if (err) reject(err);
            else if (record && (record.length > 0)) fulfill({discordId: user, currency: currency, balance: record[0].balance});
            else fulfill({discordId: user, currency: currency, balance: 0});
          }
        );
      });
    },
    getRegister: function(user, currency = "gb") {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") user = user.id;
        Bank.find({discordId: user, currency: currency}, (err, register) => {
          if (err) reject(err);
          else {
            fulfill({
              discordId: user,
              currency: currency,
              balance: register.reduce((c, r) => c + r.value, 0),
              register: register
            });
          }
        });
      });
    },
    addCurrency: function(data, currency = "gb") {
      if (data.currency) currency = data.currency;
      return new Promise((fulfill, reject) => {
        let record = new Bank({
          discordId: data.discordId,
          description: data.description,
          currency: currency,
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
        else if (system && typeof userId == "string") query = Ign.findOne({discordId: userId, system: system });
        else if (system && Array.isArray(userId)) query = Ign.find({discordId: {$in: userId}, system: system });
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
    getByFlag: (flag) => {
      return new Promise((fulfill, reject) => {
        if (typeof flag !== "string") flag = flag.id;
        Infraction.findOne({flag}, (err, inf) => {
          if (err) reject(err);
          else fulfill(inf);
        });
      });
    },
    save: (data) => {
      return new Promise((fulfill, reject) => {
        let record = new Infraction({
          discordId: (data.discordId || data.userId),
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
    retract: (flag, mod) => {
      return new Promise((fulfill, reject) => {
        if (typeof mod != "string") mod = mod.id;
        if (typeof flag != "string") flag = flag.id;
        Infraction.findOne({flag, mod}, (err, inf) => {
          if (err) reject(err);
          else if (inf) {
            Infraction.findOneAndDelete({flag, mod}, (err, doc) => {
              if (err) reject(err);
              else fulfill(inf);
            });
          } else fulfill(inf);
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
  reminder: {
    complete: (reminder) => {
      return new Promise((fulfill, reject) => {
        Remind.findOneAndRemove({_id: reminder._id}, (err) => {
          if (err) reject(err);
          else fulfill();
        });
      });
    },
    fetchReminders: () => {
      return new Promise((fulfill, reject) => {
        Remind.find({timestamp: {$lte: new Date()}}, (error, docs) => {
          if (error) reject(error);
          else fulfill(docs);
        });
      });
    },
    setReminder: (data) => {
      return new Promise((fulfill, reject) => {
        let reminder = new Remind(data);
        reminder.save((err, doc) => {
          if (err) reject(err);
          else fulfill(doc);
        });
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
            else {
              serverSettings.set(server.serverId, server);
              fulfill(server)
            };
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
  tags: {
    addTag: (data) => {
      return new Promise((fulfill, reject) => {
        Tag.findOneAndUpdate(
          {serverId: data.serverId, tag: data.tag},
          {$set: {response: data.response, attachment: data.attachment}},
          {upsert: true, new: true},
          function (err, cmd) {
            if (err) reject(err);
            else {
              if (cmd.attachment) {
                let fs = require("fs");
                let request = require("request");
                request(data.url).pipe(fs.createWriteStream(process.cwd() + "/storage/" + cmd._id));
              }
              fulfill(cmd);
            }
          }
        );
      });
    },
    fetchTags: () => {
      return new Promise((fulfill, reject) => {
        Tag.find({}, function(err, cmds) {
          if (err) reject(err);
          else fulfill(cmds);
        });
      });
    },
    removeTag: (guild, tag) => {
      return new Promise((fulfill, reject) => {
        Tag.findOneAndRemove(
          {serverId: guild.id, tag: tag},
          function(err, cmd) {
            if (err) reject(err);
            else fulfill(cmd);
          }
        );
      });
    }
  },
  user: {
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
      users = Array.from(users.values());
      let response = { users: [], xp: 0 };
      if (users.length == 0) return Promise.resolve(response);
      else return new Promise((fulfill, reject) => {
        let xp = Math.floor(Math.random() * 11) + 15;
        response.xp = xp;
        User.updateMany(
          { discordId: {$in: users} },
          { $inc: { currentXP: xp, totalXP: xp, posts: 1 } },
          { new: true, upsert: true },
          (err, newUsers) => {
            if (err) reject(err);
            else {
              User.find(
                { discordId: {$in: users} },
                (error, userDocs) => {
                  if (error) reject(error);
                  else {
                    response.users = userDocs;
                    fulfill(response);
                  }
                }
              );
            }
          }
        );
      });
    },
    fetchCurrentRankings: (limit = 50, page = 1) => {
      return new Promise((fulfill, reject) => {
        User.find({excludeXP: false})
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
        User.find({excludeXP: false})
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
            User.countDocuments({"$or": [{totalXP: {"$gt": userDoc.totalXP}}, {totalXP: userDoc.totalXP, currentXP: {"$gt": userDoc.currentXP}}]}, (e, userRank) => {
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
            User.countDocuments({"$or": [{currentXP: {"$gt": userDoc.currentXP}}, {currentXP: userDoc.currentXP, totalXP: {"$gt": userDoc.totalXP}}]}, (e, currentRank) => {
              if (e) reject(e);
              else {
                userDoc.currentRank = currentRank + 1;

                User.countDocuments({"$or": [{totalXP: {"$gt": userDoc.totalXP}}, {totalXP: userDoc.totalXP, currentXP: {"$gt": userDoc.currentXP}}]}, (e, lifeRank) => {
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
    getUsers: (options) => {
      return new Promise((fulfill, reject) => {
        User.find(options, (error, userDocs) => {
          if (error) reject(error);
          else fulfill(userDocs);
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
            posts: 0,
            stars: 0,
            preferences: 0,
            ghostBucks: 0,
            house: null,
            excludeXP: true,
            roles: []
          });
          newMember.save((err, doc) => {
            if (err) console.error(err);
            else console.log("New Member Saved: " + doc.discordId);
          });
        }
      });
    },
    resetXP: () => {
      return new Promise((fulfill, reject) => {
        User.updateMany(
          {},
          { currentXP: 0 },
          { new: true, upsert: true },
          (err, users) => {
            if (err) reject(err);
            else fulfill(users);
          }
        );
      });
    },
    update: (member, options) => {
      return new Promise((fulfill, reject) => {
        if ((typeof user) != "string") member = member.id;

        User.findOne({discordId: member}, (err, user) => {
          if (err) reject (err);
          else if (user) {
            user.set(options);
            user.save((err, newUser) => {
              if (err) reject(err);
              else fulfill(newUser);
            });
          } else fulfill(null);
        });
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
  init: (bot) => {
    bot.guilds.forEach(guild => {
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
