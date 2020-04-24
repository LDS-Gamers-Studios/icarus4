const Augur = require("augurbot"),
  u = require("../utils/utils");

const alerts = new Map();

const Module = new Augur.Module()
.addEvent("message", msg => {
  if (msg.webhookID && alerts.has(msg.webhookID)) {
    msg.channel.send(msg.guild.roles.get(alerts.get(msg.webhookID)) + ": New update!").catch(u.noop);
  }
})
.addEvent("loadConfig", () => {
  Module.config.sheets.get("Alerts").getRows((e, rows) => {
    if (e) {
      u.alertError(e, "Error loading alerts.");
    } else {
      for (const row of rows) alerts.set(row.webhookid, row.pingid);
    }
  });
});

module.exports = Module;
