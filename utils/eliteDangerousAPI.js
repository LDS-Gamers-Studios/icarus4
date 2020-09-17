// Message GuyInGrey if this has issues!

const request = require("request-promise-native");

// Note: The EDSM rate limit is 360/hour. More than enough for this server's usage.
let apiUrl = "https://www.edsm.net/";

function getSystemInfo(systemName) {
  return new Promise(async (fulfill, reject) => {
    try {
      let starSystem = await getObjectFromAPI("api-v1/system?showPrimaryStar=1&showInformation=1&showPermit=1&showId=1&systemName=" + systemName);
      if (Array.isArray(starSystem)) {
        fulfill(null);
      }
      if (starSystem.information === {}) {
        starSystem.information = null;
      }

      let bodiesResponse = await getObjectFromAPI("api-system-v1/bodies?systemName=" + systemName);
      starSystem.bodies = bodiesResponse.bodies;
      starSystem.bodiesURL = bodiesResponse.url;

      let stationsResponse = await getObjectFromAPI("api-system-v1/stations?systemName=" + systemName);
      starSystem.stations = stationsResponse.stations;
      starSystem.stationsURL = stationsResponse.url;

      let factionsResponse = await getObjectFromAPI("api-system-v1/factions?systemName=" + systemName);
      starSystem.factions = factionsResponse.factions;
      starSystem.factionsURL = factionsResponse.url;

      fulfill(starSystem);
    } catch (error) { reject(error); }
  });
}

function getEliteStatus() {
  return new Promise(async (fulfill, reject) => {
    try {
      let status = await getObjectFromAPI("api-status-v1/elite-server");
      fulfill(status);
    } catch (error) { reject(error); }
  });
}

function getGalnetFeed() {
  return new Promise(async (fulfill, reject) => {
    try {
      let url = "https://www.alpha-orbital.com/galnet-feed";
      fulfill(JSON.parse((await request(url)).replace("<br \/>", "\n")));
    } catch (error) { reject(error); }
  });
}

function getObjectFromAPI(params) {
  return new Promise(async (fulfill, reject) => {
    try {
      let url = apiUrl + params;
      var text = await request(url);
      fulfill(JSON.parse(text));
    } catch (error) { reject(error); }
  });
}

module.exports = {
  getSystemInfo,
  getEliteStatus,
  getGalnetFeed,
};
