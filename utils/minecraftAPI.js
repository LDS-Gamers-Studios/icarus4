// This is for connecting to Minecraft APIs
// to get information like UUIDs and skins.

// Message GuyInGrey if this has issues

const request = require("request-promise-native");

let UUIDUrl = "https://api.mojang.com/users/profiles/minecraft/";

function getObjectFromAPI(url) {
  return new Promise(async (fulfill, reject) => {
    try {
      var text = await request(url);
      fulfill(JSON.parse(text));
    } catch (error) { reject(error); }
  });
}

function getPlayerUUID(username) {
  return new Promise(async (fulfill, reject) => {
    try {
      let response = await getObjectFromAPI(UUIDUrl + username);
      if (response === null) { fulfill(null); return; }
      fulfill(response.id);
    } catch (error) { reject(error); }
  });
}