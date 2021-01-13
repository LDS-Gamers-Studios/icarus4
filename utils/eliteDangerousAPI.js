// Message GuyInGrey if this has issues!

// DEPRECATED
//const request = require("request-promise-native");

// Replacement to request-promise-native
const axios = require('axios');

// Note: The EDSM rate limit is 360/hour. More than enough for this server's usage.
let apiUrl = "https://www.edsm.net/";

function getSystemInfo(systemName) {
  return new Promise(async (fulfill, reject) => {
    try {
      let starSystem = await getObjectFromAPIAxios(apiUrl + "api-v1/system", {
        showPrimaryStar: 1,
        showInformation: 1,
        showPermit: 1,
        showId: 1,
        systemName: systemName
      });

      if (Array.isArray(starSystem)) {
        fulfill(null);
      }
      if (starSystem.information === {}) {
        starSystem.information = null;
      }

      let bodiesResponse = await getObjectFromAPIAxios(apiUrl + "api-system-v1/bodies", {
        systemName: systemName
      });
      starSystem.bodies = bodiesResponse.bodies;
      starSystem.bodiesURL = bodiesResponse.url;

      let stationsResponse = await getObjectFromAPIAxios(apiUrl + "api-system-v1/stations", {
        systemName: systemName
      });
      starSystem.stations = stationsResponse.stations;
      starSystem.stationsURL = stationsResponse.url;

      let factionsResponse = await getObjectFromAPIAxios(apiUrl + "api-system-v1/factions", {
        systemName: systemName
      });
      starSystem.factions = factionsResponse.factions;
      starSystem.factionsURL = factionsResponse.url;

      fulfill(starSystem);
    } catch (error) { reject(error); }
  });
}

function getEliteStatus() {
  return new Promise(async (fulfill, reject) => {
    try {
      let status = await getObjectFromAPIAxios(apiUrl + "api-status-v1/elite-server", { });
      fulfill(status);
    } catch (error) { reject(error); }
  });
}

function getGalnetFeed() {
  return new Promise(async (fulfill, reject) => {
    try {
      axios.get("https://www.alpha-orbital.com/galnet-feed")
        .then(function (response) {
          fulfill(response.data);

        }).catch(function (error) {
          reject(error);
        });
    } catch (error) { reject(error); }
  });
}

function getObjectFromAPIAxios(url, params) {
  return new Promise(async (fulfill, reject) => {
    try {
      axios.get(url, {
        params: params
      })
      .then(function (response) {
        if (response.statusCode.toString()[0] == "2") {
          fulfill(JSON.parse(response.data));
        } else {
          reject("Non-OK Status Code From API: " + response.statusCode.toString());
        }
      })
      .catch(function (error) {
        reject(error);
      });

    } catch (error) { reject(error); }
  });
}

module.exports = {
  getSystemInfo,
  getEliteStatus,
  getGalnetFeed,
};
