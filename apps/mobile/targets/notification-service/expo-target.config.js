// The iPhone's notification extension (AUD5-07): it adds the article's photo to the
// notification of a new article. Android shows the photo without it.
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "notification-service",
  deploymentTarget: "15.1",
  bundleIdentifier: ".notification-service",
};
