const request = require("request");

const SnipCart = function(auth) {
  this.key = auth;

  this.callApi = function(call, params = {}, method = "GET") {
    return new Promise((fulfill, reject) => {
      method = method.toUpperCase();

      call = encodeURI(call);

      if (method == "GET") {
        let urlParams = Object.keys(params).map((key) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
        ).join("&");
        call += (urlParams ? "?" + urlParams : "");
      }

      request(
        {
          baseUrl: "https://app.snipcart.com/api",
          url: call,
          body: (params ? params : null),
          json: true,
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          auth: {
            user: this.key, pass: ""
          },
          encoding: "utf8",
          method: method
        },
        function(error, response, body) {
          if (error) reject(error);
          else if (typeof body === "string") fulfill(JSON.parse(body));
          else fulfill(body);
        }
      );
    });
  };

  // DISCOUNTS

  this.deleteDiscount = function(discount) {
    let id = ((typeof discount == "string") ? discount : discount.id);
    return this.callApi(`/discounts/${id}`, null, "DELETE");
  };

  this.editDiscount = function(discount) {
    return this.callApi(`/discounts/${discount.id}`, discount, "PUT");
  };

  this.getDiscountCode = function(code) {
    return new Promise((fulfill, reject) => {
      this.callApi("/discounts").then(discounts =>
        fulfill(discounts.find(d => d.code == code))
      ).catch(reject);
    });
  };

  this.getDiscounts = function() {
    return this.callApi("/discounts");
  };

  this.newDiscount = function(discount) {
    return this.callApi("/discounts", discount, "POST");
  };

  return this;
};

module.exports = SnipCart("ST_OGE1ZDEyOTktNmM3Yy00Y2UyLTlhZjEtZTFkNDM0YTlhZmVkNjM2NDI2NTM5ODMzMTA3MjI1");
