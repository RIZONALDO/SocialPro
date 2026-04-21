export function photoStorageUrl(objectPath: string | null | undefined): string | undefined {
  if (!objectPath) return undefined;
  if (objectPath.startsWith("http")) return objectPath;
  return `/api/storage${objectPath}`;
}
