/**
 * The saved shape of a navigation menu, and the coercion that guarantees it.
 *
 * `HeaderMenu.mainMenu` is a `Json` column, so whatever the dashboard posts is
 * what the public site renders — there is no schema between them. The site now
 * builds its header from this document, which makes a malformed entry a broken
 * navigation rather than a bad row in an admin table, so the API normalizes on
 * write instead of trusting the client.
 *
 * The per-level key names (`child_menu` → `sub_child_menu` →
 * `sub_sub_child_menu`, with the deepest level using `sub_sub_child_title` /
 * `sub_sub_child_url`) are inherited and deliberately preserved: menus already
 * saved in production use them, and so does the footer editor.
 */

/**
 * Where a link came from — a page picked from the CMS, a hand-typed URL, or
 * `label`: a heading with no destination at all, which is how a pure dropdown
 * group like "Solutions" is authored.
 */
export type MenuLinkSource = "page" | "custom" | "label";

type LinkFields = {
  title: string;
  url: string;
  /**
   * The `PickablePage` id this entry was attached from, when it was picked
   * rather than typed. Kept so the editor can show the entry as a real page
   * (and re-resolve its title) instead of as an anonymous string pair.
   */
  page_id?: string | null;
  source?: MenuLinkSource;
};

export type SubSubChildMenuItem = {
  sub_sub_child_title: string;
  sub_sub_child_url: string;
  page_id?: string | null;
  source?: MenuLinkSource;
};

export type SubChildMenuItem = LinkFields & {
  sub_sub_child_menu: SubSubChildMenuItem[] | false;
};

export type ChildMenuItem = LinkFields & {
  sub_child_menu: SubChildMenuItem[] | false;
};

export type MainMenuItem = LinkFields & {
  child_menu: ChildMenuItem[] | false;
};

const str = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const source = (value: unknown): MenuLinkSource | undefined =>
  value === "page" || value === "custom" || value === "label" ? value : undefined;

const pageId = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** Only the keys we recognise survive, so a stale field can't ride along on a
 *  re-save the way the removed utility-bar fields once did. */
const linkFields = (raw: Record<string, unknown>, title: string, url: string): LinkFields => {
  const item: LinkFields = { title, url };
  const id = pageId(raw.page_id);
  const from = source(raw.source);
  if (id) item.page_id = id;
  if (from) item.source = from;
  return item;
};

/** `false` rather than `[]` when a level is empty: that is how the editor and
 *  the stored documents both spell "this entry is not a dropdown". */
const listOrFalse = <T,>(items: T[]): T[] | false => (items.length > 0 ? items : false);

const asRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry === "object" && entry !== null && !Array.isArray(entry)
      )
    : [];

function normalizeSubSubChild(raw: Record<string, unknown>): SubSubChildMenuItem | null {
  const title = str(raw.sub_sub_child_title);
  if (!title) return null;

  const item: SubSubChildMenuItem = {
    sub_sub_child_title: title,
    sub_sub_child_url: str(raw.sub_sub_child_url),
  };
  const id = pageId(raw.page_id);
  const from = source(raw.source);
  if (id) item.page_id = id;
  if (from) item.source = from;
  return item;
}

function normalizeSubChild(raw: Record<string, unknown>): SubChildMenuItem | null {
  const title = str(raw.title);
  if (!title) return null;

  return {
    ...linkFields(raw, title, str(raw.url)),
    sub_sub_child_menu:
      raw.sub_sub_child_menu === false
        ? false
        : listOrFalse(
            asRecords(raw.sub_sub_child_menu)
              .map(normalizeSubSubChild)
              .filter((item): item is SubSubChildMenuItem => item !== null)
          ),
  };
}

function normalizeChild(raw: Record<string, unknown>): ChildMenuItem | null {
  const title = str(raw.title);
  if (!title) return null;

  return {
    ...linkFields(raw, title, str(raw.url)),
    sub_child_menu:
      raw.sub_child_menu === false
        ? false
        : listOrFalse(
            asRecords(raw.sub_child_menu)
              .map(normalizeSubChild)
              .filter((item): item is SubChildMenuItem => item !== null)
          ),
  };
}

/**
 * Coerce a posted menu into the stored shape.
 *
 * Entries with no label are dropped at every level — a row the editor added but
 * never filled in would otherwise publish as an unlabelled, unclickable gap in
 * the navigation. A label with no URL is kept: that is exactly how a dropdown
 * parent is authored, and the site ignores a parent's own href anyway.
 */
export function normalizeMainMenu(value: unknown): MainMenuItem[] {
  return asRecords(value)
    .map((raw): MainMenuItem | null => {
      const title = str(raw.title);
      if (!title) return null;

      return {
        ...linkFields(raw, title, str(raw.url)),
        child_menu:
          raw.child_menu === false
            ? false
            : listOrFalse(
                asRecords(raw.child_menu)
                  .map(normalizeChild)
                  .filter((item): item is ChildMenuItem => item !== null)
              ),
      };
    })
    .filter((item): item is MainMenuItem => item !== null);
}

/** The header's single call-to-action button. */
export type HeaderContactDetails = { ctaText: string; ctaUrl: string };

/**
 * Read only the two fields the header actually renders.
 *
 * Documents saved before the utility bar was removed still carry
 * whatsapp/care keys; spreading the stored object would carry them straight
 * back out on every save.
 */
export function normalizeContactDetails(value: unknown): HeaderContactDetails | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const raw = value as Record<string, unknown>;
  return { ctaText: str(raw.ctaText), ctaUrl: str(raw.ctaUrl) };
}
