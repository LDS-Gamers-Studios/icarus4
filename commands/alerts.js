const Augur = require("augurbot"),
  u = require("../utils/utils");

const alerts = new Map();

const Module = new Augur.Module()
.addEvent("message", msg => {
  if (msg.webhookID && alerts.has(msg.webhookID)) {
    let alert = alerts.get(msg.webhookID);
    msg.channel.send(msg.guild.roles.get(alert.role) + `: New update from ${alert.name}!`).catch(u.noop);
  }
})
.addEvent("loadConfig", () => {
  Module.config.sheets.get("Alerts").getRows((e, rows) => {
    if (e) {
      u.errorHandler(e, "Error loading alerts.");
    } else {
      for (const row of rows) alerts.set(row.webhookid, {role: row.pingid, name: row.alertname});
    }
  });
});

module.exports = Module;
