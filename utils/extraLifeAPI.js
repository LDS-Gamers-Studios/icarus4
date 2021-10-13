const { request } = require("https");

class ExtraLifeAPI {
  constructor (data = {}) {
    this.set(data);
    this.teams = new Map();
    this.participants = new Map();
  }

  _call(path, data) {
    return new Promise((fulfill, reject) => {
      if (data) {
        path += "?" + Array.from(Object.keys(data)).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`).join("&");
      }
      request({
        host: "extralife.donordrive.com",
        port: 443,
        path: "/api" + path,
        method: "GET"
      }, (response) => {
        let output = "";
        response.on("data", (chunk) => {
          output += chunk;
        });
        response.on("end", () => {
          try {
            const parsed = JSON.parse(output);
            fulfill(parsed);
          } catch (error) {
            reject(error);
          }
        });
      }).end();
    });
  }

  async getParticipant(participantId, force = false) {
    participantId = participantId || this.participantId;
    if (!participantId) throw Error("participantId must be provided");

    if (!force && this.participants.has(participantId)) {
      return this.participants.get(participantId);
    }

    const participant = await this._call(`/participants/${encodeURIComponent(participantId)}`);
    this.participants.set(participantId, participant);

    return participant;
  }

  async getParticipantDonations(participantId) {
    participantId = participantId || this.participantId;
    if (!participantId) throw Error("participantId must be provided");

    const donations = await this._call(`/participants/${encodeURIComponent(participantId)}/donations`);

    return donations;
  }

  async getTeam(teamId, force = false) {
    teamId = teamId || this.teamId;
    if (!teamId) throw Error("teamId must be provided");

    if (!force && this.teams.has(teamId)) {
      return this.teams.get(teamId);
    }

    const team = await this._call(`/teams/${encodeURIComponent(teamId)}`);
    this.teams.set(teamId, team);

    return team;
  }

  async getTeamDonations(teamId) {
    teamId = teamId || this.teamId;
    if (!teamId) throw Error("teamId must be provided");

    const donations = await this._call(`/teams/${encodeURIComponent(teamId)}/donations`);

    return donations;
  }

  async getTeamParticipants(teamId, force = false) {
    teamId = teamId || this.teamId;
    if (!teamId) throw Error("teamId must be provided");

    let team;
    if (!force && this.teams.has(teamId)) {
      team = this.teams.get(teamId);
    } else {
      team = await this.getTeam(teamId, force);
    }

    if (!force && team.participants) {
      return team.participants;
    }

    team.participants = await this._call(`/teams/${encodeURIComponent(teamId)}/participants`);
    return team.participants;
  }

  set(data = {}) {
    this.teamId = data.teamId || this.teamId;

    this.participantId = data.participantId || this.participantId;

    this.cache = data.cache ?? this.cache ?? true;

    if (this.teamId) {
      this.getTeam().then((team) => {
        this.team = team;
      });
    }
    if (this.participantId) {
      this.getParticipant().then((participant) => {
        this.participant = participant;
      });
    }

    return this;
  }
}

const extraLifeAPI = new ExtraLifeAPI();

module.exports = extraLifeAPI;
