const axios = require('axios');

class D2API {
  constructor(key) {
    if (key) this.setKey(key);
  }

  call(url, data, method = "get") {
    return new Promise((fulfill, reject) => {
      let params;
      if (method == "get") {
        params = data;
        data = undefined;
      }
      axios.request({
        url,
        method,
        baseURL: "https://www.bungie.net/Platform/",
        headers: {"X-API-Key": this.api_key},
        data,
        params
      }).then(fulfill, reject);
    });
  }

  setKey(key) {
    this.api_key = key;
    return this;
  }

  // ENDPOINTS
  getGroupMembers(groupId) {
    return this.call(`/GroupV2/${encodeURIComponent(groupId)}/Members`);
  }

  getUserGroups(memberId, memberType = 254, filter = 0, groupType = 1) {
    return this.call(`/GroupV2/User/${encodeURIComponent(memberType)}/${encodeURIComponent(memberId)}/${encodeURIComponent(filter)}/${encodeURIComponent(groupType)}`);
  }

  searchUsers(query) {
    return this.call(`/User/SearchUsers?q=${encodeURIComponent(query)}`);
  }
}

const apiWrapper = new D2API();

module.exports = apiWrapper;
