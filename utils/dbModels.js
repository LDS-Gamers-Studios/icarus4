const Animation = require("../models/Animation.model"),
  Ankle = require("../models/Ankle.model"),
  Badge = require("../models/Badge.model"),
  Bank = require("../models/Bank.model"),
  Ign = require("../models/Ign.model"),
  Infraction = require("../models/Infraction.model"),
  Missionary = require("../models/Missionary.model"),
  Remind = require("../models/Remind.model"),
  Server = require("../models/Server.model"),
  Spoiler = require("../models/Spoiler.model"),
  Star = require("../models/Star.model"),
  Tag = require("../models/Tag.model"),
  User = require("../models/User.model"),
  config = require("../config/config.json"),
  moment = require("moment"),
  mongoose = require("mongoose");

const {Collection} = require("discord.js"),
  serverSettings = new Collection();

mongoose.connect(config.db.db, config.db.settings);

const models = {
  animation: {
    save: async function(data) {
      let newAnimation = new Animation(data);
      return await newAnimation.save();
    },
    fetch: async function(animationId) {
      return await Animation.findOne({animationId}).exec();
    },
    fetchAll: async function(time = 14) {
      let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
      return await Animation.find({date: { $gte: since }}).exec();
    }
  },
  ankle: {
    save: async function(data) {
      let newLostAnkle = new Ankle(data);
      return newLostAnkle.save();
    },
    getAnkles: async function(time = 365) {
      let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
      return await Ankle.find({timestamp: { $gte: since }}).exec();
    },
    getChannelSummary: async function(channelId, time = 10000) {
      channelId = channelId.id ? channelId.id : channelId;
      let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));

      let records = await Ankle.find({channel: channelId, timestamp: { $gte: since }}).exec();
      return {
        channelId: channelId,
        perUser: records.reduce((acc, r) => {
          // Group lost ankles by user.
          // perUser attribute is an object with User IDs as keys and counts (within the channel) as values
          if (acc.has(r.discordId)) acc.set(r.discordId, acc.get(r.discordId) + 1);
          else acc.set(r.discordId, 1);
          return acc;
        }, new Collection()),
        total: records.length
      };
    },
    getUserSummary: async function(discordId, time = 10000) {
      if (discordId.id) discordId = discordId.id;
      let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
      let records = await Ankle.find({discordId, timestamp: { $gte: since }}).exec();
      return {
        discordId,
        perChannel: records.reduce((acc, r) => {
          // Group lost ankles by channel.
          // perChannel attribute is an object with Channel IDs as keys and counts as values
          if (acc.has(r.channel)) acc.set(r.channel, acc.get(r.channel) + 1);
          else acc.set(r.channel, 1);
          return acc;
        }, new Collection()),
        total: records.length
      };
    },
    getSummary: async function(time = 10000) {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        let records = await Ankle.find({timestamp: { $gte: since }}).exec();
        return {
          perChannel: records.reduce((acc, r) => {
            // Group lost ankles by channel.
            // perChannel attribute is an object with Channel IDs as keys and counts as values
            if (acc.has(r.channel)) acc.set(r.channel, acc.get(r.channel) + 1);
            else acc.set(r.channel, 1);
            return acc;
          }, new Collection()),
          perUser: records.reduce((acc, r) => {
            // Group lost ankles by user.
            // perUser attribute is an object with User IDs as keys and counts (within the channel) as values
            if (acc.has(r.discordId)) acc.set(r.discordId, acc.get(r.discordId) + 1);
            else acc.set(r.discordId, 1);
            return acc;
          }, new Collection()),
          total: records.length
        };
    }
  },
  badge: {
    create: async function(data) {
      let badge = new Badge(data);
      return await badge.save();
    },
    fetch: async function(id) {
      if (id) {
        return await Badge.findOne({_id: id}).exec();
      } else {
        return await Badge.find({}).exec();
      }
    },
    findByName: async function(title) {
      return await Badge.findOne({title}).exec();
    }
  },
  bank: {
    getBalance: async function(discordId, currency = "gb") {
      if (discordId) discordId = discordId.id;
      let record = await Bank.aggregate([
        { $match: { discordId, currency }},
        { $group: { _id: null, balance: {$sum: "$value"}}}
      ]).exec();
      if (record && (record.length > 0)) return {discordId, currency, balance: record[0].balance};
      else return {discordId, currency, balance: 0};
    },
    getAwardsFrom: async function(givenFrom = [], since = 0, currency = "em") {
      let awards = await Bank.find({
        currency,
        timestamp: { $gte: since },
        mod: { $in: givenFrom }
      }).exec();
      return awards;
    },
    getRegister: async function(discordId, currency = "gb") {
      if (discordId.id) discordId = discordId.id;
      let register = await Bank.find({discordId, currency}).exec();
      return {
        discordId,
        currency,
        balance: register.reduce((c, r) => c + r.value, 0),
        register: register
      };
    },
    addCurrency: async function(data, currency = "gb") {
      if (data.discordId.id) data.discordId = data.discordId.id;
      let record = new Bank({
        discordId: data.discordId,
        description: data.description,
        currency: data.currency || currency,
        value: data.value,
        mod: data.mod
      });
      return await record.save();
    }
  },
  ign: {
    delete: async function(discordId, system) {
      if (discordId.id) discordId = discordId.id;
      return await Ign.findOneAndRemove({ discordId, system }).exec();
    },
    find: async function(discordId, system) {
      if (discordId.id) discordId = discordId.id;
      if (Array.isArray(system)) return await Ign.find({discordId, system: {$in: system} }).exec();
      else if (Array.isArray(discordId)) return await Ign.find({discordId: {$in: discordId}, system }).exec();
      else if (system) return await Ign.findOne({discordId, system}).exec();
      else return await Ign.find({discordId}).exec();
    },
    getList: async function(system) {
      return await Ign.find({system}).exec();
    },
    save: async function(discordId, system, name) {
      if (discordId.id) discordId = discordId.id;
      return await Ign.findOneAndUpdate(
        { discordId, system },
        { $set: { ign: name } },
        { upsert: true, new: true }
      ).exec();
    }
  },
  infraction: {
    getSummary: async function(discordId, time = 28) {
        let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
        let records = await Infraction.find({discordId, timestamp: { $gte: since }}).exec();
        return {
          discordId,
          count: records.length,
          points: records.reduce((c, r) => c + r.value, 0),
          time,
          detail: records
        };
    },
    getByFlag: async function(flag) {
      if (flag.id) flag = flag.id;
      return await Infraction.findOne({flag}).exec();
    },
    save: async function(data) {
      let record = new Infraction({
        discordId: data.discordId,
        channel: data.channel,
        message: data.message,
        flag: data.flag,
        value: data.value,
        description: data.description,
        mod: data.mod
      });
      return await record.save();
    },
    retract: async function(flag, mod) {
      if (mod.id) mod = mod.id;
      if (flag.id) flag = flag.id;
      return await Infraction.findOneAndDelete({flag, mod}).exec();
    },
    update: async function(id, data) {
      return await Infraction.findByIdAndUpdate(id, data, {new: true}).exec();
    }
  },
  mission: {
    save: async function(data) {
      return await Missionary.findOneAndUpdate(
        { discordId: data.discordId },
        { $set: data },
        { upsert: true, new: true }
      ).exec();
    },
    findEmail: async function(email) {
      return await Missionary.findOne({ email }).exec();
    },
    delete: async function(discordId) {
      return await Missionary.findOneAndRemove({ discordId });
    },
    findAll: async function() {
      return await Missionary.find({}).exec();
    }
  },
  reminder: {
    complete: async function(reminder) {
      return await Remind.findOneAndRemove({_id: reminder._id}).exec();
    },
    fetchReminders: async function() {
      return await Remind.find({timestamp: {$lte: new Date()}}).exec();
    },
    setReminder: async function(data) {
      let reminder = new Remind(data);
      return await reminder.save();
    }
  },
  server: {
    addServer: async function(guild) {
      let newServer = new Server({
        serverId: guild.id
      });

      let server = await newServer.save();
      serverSettings.set(server.serverId, server);
      return server;
    },
    getSetting: function(guild, setting) {
      if (!serverSettings.has(guild.id)) models.server.addServer(guild);
      return serverSettings.get(guild.id)?.[setting];
    },
    saveSetting: async function(guild, setting, value) {
      let updateOptions = {};
      updateOptions[setting] = value;
      let server = await Server.findOneAndUpdate(
        {serverId: guild.id},
        {$set: updateOptions},
        {upsert: true, new: true}
      ).exec();
      serverSettings.set(server.serverId, server);
      return server;
    }
  },
  spoiler: {
    save: async function(data) {
      let newSpoiler = new Spoiler(data);
      return await newSpoiler.save();
    },
    fetchAll: async function(time = 14) {
      let since = new Date(Date.now() - (time * 24 * 60 * 60 * 1000));
      return await Spoiler.find({timestamp: { $gte: since }}).exec();
    },
    fetch: async function(spoilerId) {
      return await Spoiler.findOne({spoilerId: spoilerId}).exec();
    }
  },
  starboard: {
    denyStar: async function(starId) {
      return await Star.findOneAndUpdate({starId}, {$set: {deny: true}}).exec();
    },
    fetchStar: async function(starId) {
      return await Star.findOne({starId}).exec();
    },
    fetchMessage: async function(messageId) {
      return await Star.findOne({messageId}).exec();
    },
    saveStar: async function(message, starpost) {
      let newStar = new Star({
        author: message.author.id,
        messageId: message.id,
        channelId: message.channel.id,
        boardId: starpost.channel.id,
        starId: starpost.id,
        deny: false,
        timestamp: message.createdAt
      });
      return await newStar.save();
    },
    approveStar: async function(star1, star2) {
      return await Star.findOneAndUpdate(
        {starId: star1.id},
        {$set: {starId: star2.id}}
      ).exec();
    }
  },
  tags: {
    addTag: async function(data) {
      let cmd = await Tag.findOneAndUpdate(
        {serverId: data.serverId, tag: data.tag},
        {$set: {response: data.response, attachment: data.attachment}},
        {upsert: true, new: true}
      ).exec();
      if (cmd.attachment) {
        let fs = require("fs");
        let axios = require("axios");
        axios.get(data.url).then(response => {
          response.data.pipe(fs.createWriteStream(process.cwd() + "/storage/" + cmd._id));
        });
      }
      return cmd;
    },
    fetchTags: async function(data = {}) {
      return await Tag.find(data).exec();
    },
    removeTag: async function(guild, tag) {
      return await Tag.findOneAndRemove({serverId: guild.id, tag: tag}).exec();
    }
  },
  user: {
    addXp: async function(users) {
      users = Array.from(users.values());
      let response = { users: [], xp: 0 };
      if (users.length == 0) return response;
      else {
        let xp = Math.floor(Math.random() * 11) + 15;
        response.xp = xp;
        let allUsersMod = await User.updateMany(
          { discordId: {$in: users} },
          { $inc: { posts: 1 } },
          { new: true, upsert: true }
        ).exec();
        let rankUsersMod = await User.updateMany(
          { discordId: {$in: users}, excludeXP: false },
          { $inc: { currentXP: xp, totalXP: xp } },
          { new: true, upsert: false }
        ).exec();
        let userDocs = await User.find({ discordId: {$in: users} }).exec();
        response.users = userDocs;
        return response;
      }
    },
    applyBadge: async function(discordId, badge) {
      if (discordId.id) discordId = discordId.id;
      if (badge._id) badge = badge._id;
      return await Badge.findOneAndUpdate(
        {discordId},
        {$addToSet: {badges: badge}},
        {new: true, upsert: false}
      ).exec();
    },
    fetchCurrentRankings: async function(limit = 50, page = 1) {
      return await User.find({excludeXP: false})
        .sort({currentXP: -1, totalXP: -1})
        .skip(limit * (page - 1))
        .limit(limit)
        .exec();
    },
    fetchLifetimeRankings: async function(limit = 50, page = 1) {
      return await User.find({excludeXP: false})
        .sort({totalXP: -1, currentXP: -1})
        .skip(limit * (page - 1))
        .limit(limit)
        .exec();
    },
    fetchStarRankings: async function(limit = 50, page = 1) {
      let docs = await User.find({stars: {$gt: 0}, posts: {$gt: 0}})
        .sort({totalXP: -1, currentXP: -1})
        .exec();
      docs = docs?.map(u => { u.quality = Math.floor(1000 * u.stars / u.posts); return u; })
        .sort((a, b) => ((b.stars / b.posts) - (a.stars / a.posts)));
      return docs;
    },
    fetchUser: async function(discordId) {
        if (discordId.id) discordId = discordId.id;
        return await User.findOne({discordId}).exec();
    },
    findLifetimeRank: async function(discordId) {
      if (discordId.id) discordId = discordId.id;

      let userDoc = await User.findOne({discordId}).exec();
      let userRank = await User.countDocuments({"$or": [{totalXP: {"$gt": userDoc.totalXP}}, {totalXP: userDoc.totalXP, currentXP: {"$gt": userDoc.currentXP}}]}).exec();
      userDoc.rank = userRank + 1;
      return userDoc;
    },
    findXPRank: async function(discordId) {
      if (discordId.id) discordId = discordId.id;
      let userDoc = await User.findOne({discordId}).exec();
      let currentRank = await User.countDocuments({"$or": [{currentXP: {"$gt": userDoc.currentXP}}, {currentXP: userDoc.currentXP, totalXP: {"$gt": userDoc.totalXP}}]}).exec();
      userDoc.currentRank = currentRank + 1;
      let lifeRank = await User.countDocuments({"$or": [{totalXP: {"$gt": userDoc.totalXP}}, {totalXP: userDoc.totalXP, currentXP: {"$gt": userDoc.currentXP}}]}).exec();
      userDoc.lifeRank = lifeRank + 1;
      return userDoc;
    },
    getUsers: async function(options) {
      return await User.find(options).exec();
    },
    newUser: async function(discordId) {
      if (discordId.id) discordId = discordId.id;
      let exists = await User.findOne({discordId}).exec();
      if (exists) return exists;
      else {
        let newMember = new User({
          discordId,
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
        return newMember.save();
      }
    },
    removeBadge: async function(discordId, badge) {
      if (discordId.id) discordId = discordId.id;
      if (badge._id) badge = badge._id;
      return await Badge.findOneAndUpdate(
        {discordId},
        {$pull: {badges: badge}},
        {new: true, upsert: false}
      ).exec();
    },
    resetXP: async function() {
      return await User.updateMany(
        {},
        { currentXP: 0 },
        { new: true, upsert: true }
      ).exec();
    },
    update: async function(discordId, options) {
      if (discordId.id) discordId = discordId.id;
      return await User.findOneAndUpdate(
        {discordId},
        {$set: options},
        {new: true, upsert: false}
      ).exec();
    },
    updateRoles: async function(member) {
      return await User.findOneAndUpdate(
        {discordId: member.id},
        {$set: {roles: Array.from(member.roles.cache.keys())}},
        {new: true, upsert: false}
      ).exec();
    },
    updateTenure: async function(member) {
      return await User.findOneAndUpdate(
        {discordId: member.id},
        {$inc: { priorTenure: moment().diff(moment(member.joinedAt), "days") }},
        {new: true, upsert: false}
      ).exec();
    }
  }
};

module.exports = models;
