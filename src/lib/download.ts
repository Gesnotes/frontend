/**
 * Déclenche le téléchargement d'un blob reçu de l'API.
 *
 * L'export PDF passe par `fetch` et non par un lien direct : la route exige
 * l'en-tête `Authorization`, qu'un `<a href>` ne transmet pas.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Libéré au tour suivant : révoquer immédiatement annulerait le
  // téléchargement dans certains navigateurs.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Nettoie une chaîne pour en faire un nom de fichier sûr. */
export function safeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
