/**
 * File storage on Hostinger over FTP.
 *
 * Two things are stored this way and they must never share a folder: editor
 * media (public, browsable in the Media Library) and candidates' CVs (personal
 * documents uploaded by the public). Each caller passes its own directory and
 * public base URL, so the connection logic lives once and the separation is a
 * parameter rather than a copied file.
 */
import * as ftp from "basic-ftp";
import { Readable } from "stream";

/** Where a caller's files live, and the public URL they are served from. */
export type FtpTarget = {
  /** Absolute remote directory, e.g. "/public_html/resume-assets". */
  dir: string;
  /** Public base URL for that directory, without a trailing slash. */
  baseUrl: string;
};

/** CVs live here — their own folder on the host, never inside the media one. */
const RESUME_DIR = "/public_html/resume-assets";
const RESUME_SEGMENT = "resume-assets";

/**
 * basic-ftp wants a bare host or IP.
 *
 * Strips any scheme, path or port that crept in from a copy-pasted connection
 * string — otherwise DNS is asked to resolve the whole URL and fails with
 * ENOTFOUND, which reads as "the server is down" rather than "the value is
 * malformed".
 */
export function ftpHost(): string {
  const raw = (process.env.HOSTINGER_FTP_HOST || "").trim();
  return raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/[/:].*$/, "");
}

async function connect(client: ftp.Client): Promise<void> {
  await client.access({
    host: ftpHost(),
    user: process.env.HOSTINGER_FTP_USER!,
    password: process.env.HOSTINGER_FTP_PASS!,
    port: Number(process.env.HOSTINGER_FTP_PORT) || 21,
    secure: false,
  });
}

/** Upload a buffer under `filename` and return its public URL. */
export async function uploadToHostinger(
  buffer: Buffer,
  filename: string,
  target: FtpTarget
): Promise<string> {
  const client = new ftp.Client();
  try {
    await connect(client);
    // Creates the folder on first upload, so a new target needs no manual
    // setup on the host.
    await client.ensureDir(target.dir);
    await client.uploadFrom(Readable.from(buffer), filename);
    return `${target.baseUrl.replace(/\/$/, "")}/${filename}`;
  } finally {
    client.close();
  }
}

/** Remove a stored file. Throws if it is already gone — callers decide. */
export async function deleteFromHostinger(
  filename: string,
  target: FtpTarget
): Promise<void> {
  const client = new ftp.Client();
  try {
    await connect(client);
    await client.remove(`${target.dir}/${filename}`);
  } finally {
    client.close();
  }
}

/** Editor media — the Media Library. */
export function mediaTarget(): FtpTarget {
  return {
    dir: process.env.HOSTINGER_MEDIA_PATH || "/public_html/media",
    baseUrl: process.env.HOSTINGER_MEDIA_URL || "",
  };
}

/**
 * Candidate CVs — their own folder, configured by HOSTINGER_RESUME_PATH and
 * HOSTINGER_RESUME_URL.
 *
 * When those are unset the folder is still a separate one: the path defaults to
 * /public_html/resume-assets and the URL to /resume-assets on the media host's
 * origin. A deployment that forgets the variables therefore stores CVs apart
 * from editor media rather than mixing the two, which is the one mistake here
 * that would be hard to undo.
 */
export function resumeTarget(): FtpTarget {
  const dir = process.env.HOSTINGER_RESUME_PATH?.trim();
  const baseUrl = process.env.HOSTINGER_RESUME_URL?.trim();
  if (dir && baseUrl) return { dir, baseUrl: baseUrl.replace(/\/$/, "") };

  return {
    dir: dir || RESUME_DIR,
    baseUrl: baseUrl || `${mediaOrigin()}/${RESUME_SEGMENT}`,
  };
}

/** Scheme + host of the media URL, so the resume URL can sit beside it. */
function mediaOrigin(): string {
  const raw = (process.env.HOSTINGER_MEDIA_URL || "").trim();
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

/**
 * A filename that is safe as a remote path segment.
 *
 * Anything outside the allowed set becomes "_", so a candidate cannot smuggle
 * a slash or "../" into the path they are written to.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
