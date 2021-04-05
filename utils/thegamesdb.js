const axios = require("axios");

class theGamesDBApi {
  constructor(apikey) {
    this._setKey(apikey);
  }

  async _call(url, params, data, method = "get") {
    return (await axios({
      url,
      baseURL: "https://api.thegamesdb.net/",
      method,
      headers: null,
      params,
      data
    })).data?.data;
  }

  _setKey(apikey) {
    this.apikey = apikey;
  }

  byGameName(name, options = {}) {
    let params = {
      apikey: this.apikey,
      name,
      fields: (Array.isArray(options.fields) ? options.fields.join(",").toLowerCase() : options.fields),
      filter: (Array.isArray(options.filter) ? options.filter.join(",").toLowerCase() : options.filter),
      include: (Array.isArray(options.include) ? options.include.join(",").toLowerCase() : options.include),
      page: options.page
    };
    return this._call("/v1.1/Games/ByGameName", params);
  }

  images(games_id, options = {}) {
    let params = {
      apikey: this.apikey,
      games_id,
      filter: options.filter,
      page: options.page
    }
    return this._call("/v1/Games/Images", params);
  }
}

const api = new theGamesDBApi();

api.byGameName("Borderlands 2", {fields: ["rating"]}).then((data) => {
  for (let game of data.games.filter(g => g.game_title.toLowerCase() == "borderlands 2" && g.rating != "Not Rated")) {
    console.log(game);
  }
});

module.exports = theGamesDBApi;
