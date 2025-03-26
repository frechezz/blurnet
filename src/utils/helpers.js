const { InputFile } = require("grammy");
const path = require("path");

/**
 * Utility function to upload media files and get their IDs
 */
async function uploadMediaAndGetIds(ctx) {
  const photos = [
    "tariffs.png",
    "instruction.png",
    "payment_success.png",
    "payment_rejected.png",
    "waiting.png",
    "rules.png",
  ];

  const fileIds = {};

  for (const photo of photos) {
    const photoPath = path.join(__dirname, "../../images", photo);
    const { photo: photoArray } = await ctx.replyWithPhoto(
      new InputFile(photoPath),
    );
    const fileId = photoArray[photoArray.length - 1].file_id;
    const photoName = photo.replace(".png", "");
    fileIds[photoName] = fileId;
  }

  return fileIds;
}

module.exports = {
  uploadMediaAndGetIds,
};
