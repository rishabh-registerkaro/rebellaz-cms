/**
 * Is this a CV *we* stored?
 *
 * An application's `resumeUrl` arrives from the browser, and an admin clicks it
 * later from the dashboard or an alert email. Only URLs under our own resume
 * folder are kept; anything else is dropped rather than stored, so the CMS can
 * never be used to plant a link in front of the hiring team.
 */
import { resumeTarget } from "./hostingerFtp";

export function isOwnResumeUrl(url: string): boolean {
  const base = resumeTarget().baseUrl.replace(/\/$/, "");
  if (!base) return false;

  try {
    const parsed = new URL(url);
    const expected = new URL(base);

    if (parsed.origin !== expected.origin) return false;
    // A trailing slash on the folder prevents "/resume-assets-public/evil.pdf"
    // from passing as a prefix match of "/resume-assets".
    return parsed.pathname.startsWith(`${expected.pathname.replace(/\/$/, "")}/`);
  } catch {
    return false;
  }
}
