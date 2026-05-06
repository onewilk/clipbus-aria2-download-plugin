const { definePlugin } = require("./sdk/definePlugin");
const { createDownloadDetector } = require("./detectors/downloadDetector");
const { createDownloadRenderer } = require("./renderers/downloadRenderer");

module.exports = definePlugin({
  setup() {
    return {
      attachmentRenderers: {
        "download-renderer": createDownloadRenderer()
      },
      detectors: {
        "link-detector": createDownloadDetector()
      },
      actions: {}
    };
  }
});
