const {
  ATTACHMENT_TYPE,
  buildDownloadAttachmentKey,
  buildDownloadSearchProjection,
  createDownloadAttachmentPayload
} = require("../shared/downloadAttachmentPayload");

async function detectDownloadAttachment(input) {
  const payload = createDownloadAttachmentPayload(input);
  if (!payload) {
    return [];
  }

  return [
    {
      attachmentType: ATTACHMENT_TYPE,
      attachmentKey: buildDownloadAttachmentKey(payload),
      payloadJson: JSON.stringify(payload),
      searchProjection: buildDownloadSearchProjection(payload),
      attachmentSyncScope: "local_only"
    }
  ];
}

function createDownloadDetector() {
  return {
    async detect(input) {
      return {
        artifacts: await detectDownloadAttachment(input)
      };
    }
  };
}

module.exports = {
  createDownloadDetector,
  detectDownloadAttachment
};
