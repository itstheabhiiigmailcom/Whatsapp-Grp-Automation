const contactNames =
  new Map<string, string>();

export function storeContactName(
  jid: string,
  name: string | undefined
): void {
  if (!jid || !name) {
    return;
  }

  const trimmedName =
    name.trim();

  if (!trimmedName) {
    return;
  }

  contactNames.set(
    jid,
    trimmedName
  );
}

export function getContactName(
  jid: string
): string {
  return (
    contactNames.get(jid) ??
    jid.split("@")[0] ??
    "Unknown User"
  );
}
