/**
 * Parse profile.
 *
 * @param {Object|String} json
 * @return {Object}
 * @api private
 */
exports.parse = function(json) {
  if ('string' == typeof json) {
    json = JSON.parse(json);
  }


  console.log(json);
  
  var profile = {};
  profile.name = String(json.id);
  profile.scope = json.name;
  profile.profile = json.login;
  return profile;
};
