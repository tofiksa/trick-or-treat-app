export type BuildPhotoFileNameArgs = {
  userName: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  ext: string;
};

function sanitizeUserName(userName: string): string {
  const slug = userName
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "bruker";
}

export function buildPhotoFileName({
  userName,
  latitude,
  longitude,
  timestamp,
  ext,
}: BuildPhotoFileNameArgs): string {
  const name = sanitizeUserName(userName);
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  const cleanExt = ext.replace(/^\.+/, "") || "jpg";
  return `${name}_${lat}_${lng}_${timestamp}.${cleanExt}`;
}
