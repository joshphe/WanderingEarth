/** 每用户照片上传上限，通过环境变量 MAX_PHOTOS_PER_USER 配置，默认 50 */
export const MAX_PHOTOS_PER_USER = parseInt(
  process.env.MAX_PHOTOS_PER_USER || "50",
  10
);
