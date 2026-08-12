"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import type { PickablePage } from "@/app/lib/constants/sitePages";
import type {
  ChildMenuItem,
  MainMenuItem,
  MenuLinkSource,
  SubChildMenuItem,
  SubSubChildMenuItem,
} from "@/app/lib/utils/menuTree";
import { LinkPicker, type LinkValue } from "./link-picker";

/**
 * The single call-to-action button in the site header.
 *
 * This used to also carry whatsappLabel / whatsappNumber / careLabel /
 * careNumber, describing a utility bar the Rebel Labz header does not
 * have — inherited from the project this CMS was forked from. Those four
 * fields rendered nowhere, so they were removed rather than left on screen
 * implying they did something.
 */
interface HeaderContactDetails {
  ctaText: string;
  ctaUrl: string;
}

/**
 * Matches what the site shows today, so saving without editing is a no-op
 * instead of silently relabelling the button and pointing it at a dead URL.
 * Mirrors HEADER_CTA in the frontend's lib/content.ts — the fallback the site
 * uses when this menu is empty.
 */
const defaultContactDetails: HeaderContactDetails = {
  ctaText: "Collaborate with us",
  ctaUrl: "/contact",
};

/** The picker speaks {title, url}; the deepest level is stored under its own
 *  inherited key names. Converting at the boundary keeps one picker for all
 *  four levels without renaming fields in documents already saved. */
const leafToLink = (item: SubSubChildMenuItem): LinkValue => ({
  title: item.sub_sub_child_title,
  url: item.sub_sub_child_url,
  page_id: item.page_id,
  source: item.source,
});

const linkToLeaf = (link: LinkValue): SubSubChildMenuItem => ({
  sub_sub_child_title: link.title,
  sub_sub_child_url: link.url,
  page_id: link.page_id,
  source: link.source,
});

export default function HeaderMenuPage() {
  const [mainMenu, setMainMenu] = useState<MainMenuItem[]>([]);
  const [contactDetails, setContactDetails] =
    useState<HeaderContactDetails>(defaultContactDetails);
  /**
   * Whether the CTA's destination is being picked or typed. Editor-only state:
   * the button stores a bare URL, and which way it was chosen changes nothing
   * about how the site renders it.
   */
  const [ctaSource, setCtaSource] = useState<MenuLinkSource>("page");
  const [pages, setPages] = useState<PickablePage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHeaderMenu();
    fetchPages();
  }, []);

  // Both loaders start from their `true` initial state and only ever clear it,
  // so neither touches state synchronously — a setState in an effect body
  // cascades an extra render before the request has even gone out.
  const fetchHeaderMenu = async () => {
    try {
      const res = await fetch("/api/header-menu");
      const data = await res.json();

      if (data.success && data.headerMenu) {
        setMainMenu(data.headerMenu.main_menu || []);
        // Read the two fields explicitly rather than spreading the stored
        // object: records saved before the utility bar was removed still carry
        // whatsapp/care keys, and spreading would carry them straight back out
        // on the next save.
        const stored = data.headerMenu.contact_details || {};
        setContactDetails({
          ctaText: stored.ctaText || defaultContactDetails.ctaText,
          ctaUrl: stored.ctaUrl || defaultContactDetails.ctaUrl,
        });
      }
    } catch (error) {
      console.error("Error fetching header menu:", error);
      toast.error("Failed to load header menu", { closeButton: true });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Every page a menu entry can point at. Fetched once for the whole editor
   * rather than per picker — a menu with a dozen entries would otherwise fire a
   * dozen identical requests, and every picker offers the same list.
   */
  const fetchPages = async () => {
    try {
      const res = await fetch("/api/site-pages");
      const data = await res.json();
      if (data.success) setPages(data.pages ?? []);
      else toast.error("Failed to load the page list", { closeButton: true });
    } catch (error) {
      console.error("Error fetching site pages:", error);
      toast.error("Failed to load the page list", { closeButton: true });
    } finally {
      setPagesLoading(false);
    }
  };

  const updateContact = (field: keyof HeaderContactDetails, value: string) =>
    setContactDetails((p) => ({ ...p, [field]: value }));

  /* ── Main menu ────────────────────────────────────────────────────────── */

  const addMainMenu = () =>
    setMainMenu([...mainMenu, { title: "", url: "", child_menu: false }]);

  const updateMainMenu = (index: number, link: LinkValue) => {
    const updated = [...mainMenu];
    updated[index] = { ...updated[index], ...link };
    setMainMenu(updated);
  };

  const removeMainMenu = (index: number) =>
    setMainMenu(mainMenu.filter((_, i) => i !== index));

  const toggleChildMenu = (mainIndex: number) => {
    const updated = [...mainMenu];
    const opening = updated[mainIndex].child_menu === false;
    updated[mainIndex].child_menu = opening ? [] : false;

    // Turning an entry into a dropdown when nothing is attached to it yet means
    // a group like "Solutions" — a heading over the pages, not a page itself.
    // Pre-selecting that is the difference between one click and hunting for
    // the option inside the picker.
    if (opening && !updated[mainIndex].url && !updated[mainIndex].page_id) {
      updated[mainIndex].source = "label";
    }
    setMainMenu(updated);
  };

  /* ── Child menu ───────────────────────────────────────────────────────── */

  const addChildMenu = (mainIndex: number) => {
    const updated = [...mainMenu];
    if (updated[mainIndex].child_menu === false) updated[mainIndex].child_menu = [];
    (updated[mainIndex].child_menu as ChildMenuItem[]).push({
      title: "",
      url: "",
      sub_child_menu: false,
    });
    setMainMenu(updated);
  };

  const updateChildMenu = (mainIndex: number, childIndex: number, link: LinkValue) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    childMenu[childIndex] = { ...childMenu[childIndex], ...link };
    setMainMenu(updated);
  };

  const removeChildMenu = (mainIndex: number, childIndex: number) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    childMenu.splice(childIndex, 1);
    if (childMenu.length === 0) updated[mainIndex].child_menu = false;
    setMainMenu(updated);
  };

  const toggleSubChildMenu = (mainIndex: number, childIndex: number) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    childMenu[childIndex].sub_child_menu =
      childMenu[childIndex].sub_child_menu === false ? [] : false;
    setMainMenu(updated);
  };

  /* ── Sub child menu ───────────────────────────────────────────────────── */

  const addSubChildMenu = (mainIndex: number, childIndex: number) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    if (childMenu[childIndex].sub_child_menu === false)
      childMenu[childIndex].sub_child_menu = [];
    (childMenu[childIndex].sub_child_menu as SubChildMenuItem[]).push({
      title: "",
      url: "",
      sub_sub_child_menu: false,
    });
    setMainMenu(updated);
  };

  const updateSubChildMenu = (
    mainIndex: number,
    childIndex: number,
    subChildIndex: number,
    link: LinkValue
  ) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    const subChildMenu = childMenu[childIndex].sub_child_menu as SubChildMenuItem[];
    subChildMenu[subChildIndex] = { ...subChildMenu[subChildIndex], ...link };
    setMainMenu(updated);
  };

  const removeSubChildMenu = (
    mainIndex: number,
    childIndex: number,
    subChildIndex: number
  ) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    const subChildMenu = childMenu[childIndex].sub_child_menu as SubChildMenuItem[];
    subChildMenu.splice(subChildIndex, 1);
    if (subChildMenu.length === 0) childMenu[childIndex].sub_child_menu = false;
    setMainMenu(updated);
  };

  const toggleSubSubChildMenu = (
    mainIndex: number,
    childIndex: number,
    subChildIndex: number
  ) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    const subChildMenu = childMenu[childIndex].sub_child_menu as SubChildMenuItem[];
    subChildMenu[subChildIndex].sub_sub_child_menu =
      subChildMenu[subChildIndex].sub_sub_child_menu === false ? [] : false;
    setMainMenu(updated);
  };

  /* ── Sub sub child menu ───────────────────────────────────────────────── */

  const addSubSubChildMenu = (
    mainIndex: number,
    childIndex: number,
    subChildIndex: number
  ) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    const subChildMenu = childMenu[childIndex].sub_child_menu as SubChildMenuItem[];
    if (subChildMenu[subChildIndex].sub_sub_child_menu === false)
      subChildMenu[subChildIndex].sub_sub_child_menu = [];
    (subChildMenu[subChildIndex].sub_sub_child_menu as SubSubChildMenuItem[]).push({
      sub_sub_child_title: "",
      sub_sub_child_url: "",
    });
    setMainMenu(updated);
  };

  const updateSubSubChildMenu = (
    mainIndex: number,
    childIndex: number,
    subChildIndex: number,
    subSubChildIndex: number,
    link: LinkValue
  ) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    const subChildMenu = childMenu[childIndex].sub_child_menu as SubChildMenuItem[];
    const subSubChildMenu = subChildMenu[subChildIndex]
      .sub_sub_child_menu as SubSubChildMenuItem[];
    subSubChildMenu[subSubChildIndex] = linkToLeaf(link);
    setMainMenu(updated);
  };

  const removeSubSubChildMenu = (
    mainIndex: number,
    childIndex: number,
    subChildIndex: number,
    subSubChildIndex: number
  ) => {
    const updated = [...mainMenu];
    const childMenu = updated[mainIndex].child_menu as ChildMenuItem[];
    const subChildMenu = childMenu[childIndex].sub_child_menu as SubChildMenuItem[];
    const subSubChildMenu = subChildMenu[subChildIndex]
      .sub_sub_child_menu as SubSubChildMenuItem[];
    subSubChildMenu.splice(subSubChildIndex, 1);
    if (subSubChildMenu.length === 0)
      subChildMenu[subChildIndex].sub_sub_child_menu = false;
    setMainMenu(updated);
  };

  /* ── Save / revalidate ────────────────────────────────────────────────── */

  const handleRevalidate = async () => {
    const toastId = toast.loading("Revalidating cache...");
    try {
      const res = await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: ["header-menu"] }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cache cleared — frontend will fetch fresh content", { id: toastId });
      } else {
        toast.error(data.message || "Revalidation failed", { id: toastId });
      }
    } catch {
      toast.error("Revalidation failed", { id: toastId });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const loadingToastId = toast.loading("Saving header menu...", { closeButton: true });

      const res = await fetch("/api/header-menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ main_menu: mainMenu, contact_details: contactDetails }),
      });

      const data = await res.json();
      toast.dismiss(loadingToastId);

      if (res.ok && data.success) {
        // The API drops entries with no label, so re-seed state from what was
        // actually stored — otherwise the editor keeps showing a row the site
        // will never render.
        if (data.headerMenu?.main_menu) setMainMenu(data.headerMenu.main_menu);
        toast.success("Header menu saved successfully!", { closeButton: true });
      } else {
        toast.error(data.message || "Failed to save header menu", { closeButton: true });
      }
    } catch {
      toast.error("Failed to save header menu", { closeButton: true });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white">Header Menu</h1>
            <p className="text-slate-400">Manage your website header navigation menu</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRevalidate}
              title="Clear frontend cache for Header Menu"
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Revalidate Cache
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6"
            >
              {saving ? "Saving..." : "Save Menu"}
            </Button>
          </div>
        </div>

        {/* Header CTA — the single red button on the right of the nav */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-5 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Header CTA Button</h2>
            <p className="text-sm text-slate-400">
              The red button on the right of the navigation. Leave the label blank
              to keep the site&rsquo;s default button.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Button Text</label>
              <Input
                value={contactDetails.ctaText}
                onChange={(e) => updateContact("ctaText", e.target.value)}
                placeholder={defaultContactDetails.ctaText}
                className="bg-slate-900/60 border-slate-600 text-white placeholder-slate-400 h-10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Button Link</label>
              <LinkPicker
                urlOnly
                value={{ title: "", url: contactDetails.ctaUrl, source: ctaSource }}
                pages={pages}
                loading={pagesLoading}
                onChange={(link) => {
                  setCtaSource(link.source ?? "page");
                  updateContact("ctaUrl", link.url);
                }}
                placeholder="Choose the page this button opens"
              />
            </div>
          </div>
        </div>

        {/* Main Menu Section */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Main Menu</h2>
              <p className="text-sm text-slate-400">
                The links across the site header, in this order. Each entry is a
                page you pick — search and attach it, no URLs to type. Add child
                items to turn an entry into a dropdown that opens on hover; a
                dropdown is a heading over its children and is not itself
                clickable. Children can nest again, and the site renders every
                level. Leave this empty to keep the site&rsquo;s default
                navigation.
              </p>
            </div>
            <Button
              onClick={addMainMenu}
              size="sm"
              className="bg-indigo-500 hover:bg-indigo-600 text-white !gap-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Main Menu
            </Button>
          </div>

          {mainMenu.map((mainItem, mainIndex) => (
            <div
              key={mainIndex}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-5 space-y-5"
            >
              {/* Main Menu Item */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-300">
                  Main link {mainIndex + 1}
                </label>
                <LinkPicker
                  value={mainItem}
                  pages={pages}
                  loading={pagesLoading}
                  onChange={(link) => updateMainMenu(mainIndex, link)}
                  placeholder="Choose the page this menu item opens"
                />
                {mainItem.child_menu !== false && (
                  <p className="text-xs text-slate-500">
                    This entry is a dropdown: the site shows its label in the bar
                    and opens the children below on hover — its own link is never
                    followed.
                  </p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    onClick={() => toggleChildMenu(mainIndex)}
                    size="sm"
                    variant="outline"
                    className="border-slate-600 !gap-0 text-slate-300 bg-slate-700 hover:bg-slate-800 cursor-pointer hover:text-white h-9"
                  >
                    {mainItem.child_menu === false ? "Add Child Menu" : "Remove Child Menu"}
                  </Button>
                  <Button
                    onClick={() => removeMainMenu(mainIndex)}
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-9 w-9 p-0 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Child Menu */}
              {mainItem.child_menu !== false && (
                <div className="ml-4 border-l-2 border-indigo-500/30 pl-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-300">Child Menu</h3>
                    <Button
                      onClick={() => addChildMenu(mainIndex)}
                      size="sm"
                      className="bg-indigo-500 hover:bg-indigo-600 text-white h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1.5" />
                      Add Child
                    </Button>
                  </div>

                  {(mainItem.child_menu as ChildMenuItem[]).map((childItem, childIndex) => (
                    <div
                      key={childIndex}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-4"
                    >
                      {/* Child Menu Item */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300">
                          Child link {childIndex + 1}
                        </label>
                        <LinkPicker
                          value={childItem}
                          pages={pages}
                          loading={pagesLoading}
                          onChange={(link) => updateChildMenu(mainIndex, childIndex, link)}
                          placeholder="Choose a page for this dropdown item"
                        />
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button
                            onClick={() => toggleSubChildMenu(mainIndex, childIndex)}
                            size="sm"
                            variant="outline"
                            className="border-slate-600 !gap-0 text-slate-300 bg-slate-700 hover:bg-slate-800 cursor-pointer hover:text-white h-9 text-xs"
                          >
                            {childItem.sub_child_menu === false
                              ? "Add Sub Child"
                              : "Remove Sub Child"}
                          </Button>
                          <Button
                            onClick={() => removeChildMenu(mainIndex, childIndex)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-9 w-9 p-0 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Sub Child Menu */}
                      {childItem.sub_child_menu !== false && (
                        <div className="ml-4 border-l-2 border-indigo-400/30 pl-4 space-y-3 mt-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-slate-400">
                              Sub Child Menu
                            </h4>
                            <Button
                              onClick={() => addSubChildMenu(mainIndex, childIndex)}
                              size="sm"
                              className="bg-indigo-500 hover:bg-indigo-600 text-white h-8 text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1.5" />
                              Add Sub Child
                            </Button>
                          </div>

                          {(childItem.sub_child_menu as SubChildMenuItem[]).map(
                            (subChildItem, subChildIndex) => (
                              <div
                                key={subChildIndex}
                                className="bg-slate-800/30 border border-slate-600 rounded-lg p-4 space-y-3"
                              >
                                <div className="space-y-3">
                                  <label className="text-xs font-medium text-slate-400">
                                    Sub child link {subChildIndex + 1}
                                  </label>
                                  <LinkPicker
                                    size="sm"
                                    value={subChildItem}
                                    pages={pages}
                                    loading={pagesLoading}
                                    onChange={(link) =>
                                      updateSubChildMenu(
                                        mainIndex,
                                        childIndex,
                                        subChildIndex,
                                        link
                                      )
                                    }
                                    placeholder="Choose a page"
                                  />
                                  <div className="flex items-center gap-2 pt-2">
                                    <Button
                                      onClick={() =>
                                        toggleSubSubChildMenu(
                                          mainIndex,
                                          childIndex,
                                          subChildIndex
                                        )
                                      }
                                      size="sm"
                                      variant="outline"
                                      className="border-slate-500 text-slate-400 bg-slate-700 hover:bg-slate-800 cursor-pointer hover:text-white h-8 text-xs"
                                    >
                                      {subChildItem.sub_sub_child_menu === false
                                        ? "Add Sub Sub Child"
                                        : "Remove Sub Sub Child"}
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        removeSubChildMenu(mainIndex, childIndex, subChildIndex)
                                      }
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Sub Sub Child Menu */}
                                {subChildItem.sub_sub_child_menu !== false && (
                                  <div className="ml-4 border-l-2 border-indigo-300/30 pl-4 space-y-3 mt-3">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-xs font-semibold text-slate-500">
                                        Sub Sub Child Menu
                                      </h5>
                                      <Button
                                        onClick={() =>
                                          addSubSubChildMenu(mainIndex, childIndex, subChildIndex)
                                        }
                                        size="sm"
                                        className="bg-indigo-500 hover:bg-indigo-600 text-white h-7 text-xs px-2"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Row
                                      </Button>
                                    </div>

                                    {(
                                      subChildItem.sub_sub_child_menu as SubSubChildMenuItem[]
                                    ).map((subSubChildItem, subSubChildIndex) => (
                                      <div
                                        key={subSubChildIndex}
                                        className="flex items-start gap-3 bg-slate-700/20 border border-slate-500 rounded-lg p-3"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <LinkPicker
                                            size="sm"
                                            value={leafToLink(subSubChildItem)}
                                            pages={pages}
                                            loading={pagesLoading}
                                            onChange={(link) =>
                                              updateSubSubChildMenu(
                                                mainIndex,
                                                childIndex,
                                                subChildIndex,
                                                subSubChildIndex,
                                                link
                                              )
                                            }
                                            placeholder="Choose a page"
                                          />
                                        </div>
                                        <Button
                                          onClick={() =>
                                            removeSubSubChildMenu(
                                              mainIndex,
                                              childIndex,
                                              subChildIndex,
                                              subSubChildIndex
                                            )
                                          }
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0 flex-shrink-0"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {mainMenu.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">
                No main menu items — the site is showing its default navigation.
                Click &ldquo;Add Main Menu&rdquo; to take control of it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
