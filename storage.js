const { v2: cloudinary } = require('cloudinary');

function configured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

function client() {
  if (!configured()) {
    throw new Error(
      'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET as environment variables.'
    );
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

/** Uploads a base64-encoded photo and returns its public URL. */
async function uploadPhoto(base64, contentType) {
  const c = client();
  const dataUri = `data:${contentType || 'image/jpeg'};base64,${base64}`;
  const result = await c.uploader.upload(dataUri, { folder: 'n9btz-products' });
  return result.secure_url;
}

/** Best-effort delete — derives the Cloudinary public_id from a secure_url produced by uploadPhoto. */
async function deletePhoto(url) {
  if (!url || !configured()) return;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  if (!match) return;
  const publicId = match[1];
  const c = client();
  await c.uploader.destroy(publicId);
}

module.exports = { uploadPhoto, deletePhoto };
