const {
  ATTACHMENT_TYPE,
  buildDownloadAttachmentKey,
  buildDownloadSearchProjection,
  createDownloadAttachmentPayload,
  normalizeRpcConfig,
  readExternalRpcConfig
} = require("../shared/downloadAttachmentPayload");

async function detectDownloadAttachment(input, ctx) {
  const externalConfig = await readExternalRpcConfig(ctx);
  const payload = createDownloadAttachmentPayload(input, normalizeRpcConfig(externalConfig));
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
    async detect(input, ctx) {
      return {
        artifacts: await detectDownloadAttachment(input, ctx)
      };
    }
  };
}

module.exports = {
  createDownloadDetector,
  detectDownloadAttachment
};
