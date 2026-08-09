import { prisma } from "@/lib/db/prisma";

export const MAX_TAGS_PER_TRANSACTION = 10;
export const MAX_TAG_NAME_LENGTH = 50;

export function parseTagInput(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of raw.split(",")) {
    const name = part.trim().slice(0, MAX_TAG_NAME_LENGTH);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= MAX_TAGS_PER_TRANSACTION) break;
  }
  return names;
}

// Tags are free-form and reusable — created on the fly the first time a name
// is used, matched by name (case-sensitive) thereafter. See spec 5.3a.
export async function resolveTagIds(userId: string, names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const ids: string[] = [];
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {},
      select: { id: true },
    });
    ids.push(tag.id);
  }
  return ids;
}

export async function syncTransactionTags(transactionId: string, tagIds: string[]): Promise<void> {
  await prisma.transactionTag.deleteMany({ where: { transactionId } });
  if (tagIds.length > 0) {
    await prisma.transactionTag.createMany({
      data: tagIds.map((tagId) => ({ transactionId, tagId })),
      skipDuplicates: true,
    });
  }
}
