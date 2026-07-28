import type { ContentDocument } from "./document";

export type VersionDiff = { titleChanged: boolean; metadataChanged: boolean; added: string[]; removed: string[]; changed: string[] };
export function compareVersions(oldTitle: string, oldDocument: ContentDocument, newTitle: string, newDocument: ContentDocument): VersionDiff {
  const oldBlocks = new Map(oldDocument.blocks.map((block) => [block.id, block]));
  const newBlocks = new Map(newDocument.blocks.map((block) => [block.id, block]));
  return {
    titleChanged: oldTitle !== newTitle,
    metadataChanged: JSON.stringify(oldDocument.metadata) !== JSON.stringify(newDocument.metadata),
    added: [...newBlocks.keys()].filter((id) => !oldBlocks.has(id)),
    removed: [...oldBlocks.keys()].filter((id) => !newBlocks.has(id)),
    changed: [...newBlocks.keys()].filter((id) => oldBlocks.has(id) && JSON.stringify(oldBlocks.get(id)) !== JSON.stringify(newBlocks.get(id))),
  };
}
