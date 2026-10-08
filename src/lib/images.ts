import "server-only";
import { lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

// Pictures are fetched automatically so nobody has to upload them:
// - places (destinations, flight arrivals): lead photo of the Wikivoyage article;
// - links (Airbnb, hotel, activity page): the page's og:image.

// Wikimedia asks API clients to identify themselves with a way to reach the operator.
const USER_AGENT = `TEE-voyages/0.1 (planificateur de voyages personnel; ${process.env.BETTER_AUTH_URL ?? "local"})`;

type PlaceInfo = { imageUrl: string | null; summary: string | null };

export async function lookupPlace(name: string): Promise<PlaceInfo> {
  const sources = ["fr.wikivoyage.org", "en.wikivoyage.org", "fr.wikipedia.org"];
  let summary: string | null = null;
  for (const host of sources) {
    const page = await searchWiki(host, name).catch(() => null);
    if (!page) continue;
    summary ??= page.summary;
    if (page.imageUrl && isPhoto(page.imageUrl)) return { imageUrl: page.imageUrl, summary };
  }
  return { imageUrl: null, summary };
}

async function searchWiki(host: string, query: string) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "5",
    prop: "pageimages|extracts",
    piprop: "thumbnail",
    pithumbsize: "1600",
    exintro: "1",
    explaintext: "1",
    exsentences: "2",
    format: "json",
    formatversion: "2",
  });
  const res = await fetch(`https://${host}/w/api.php?${params}`, {
    headers: { "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  type Page = { index: number; title: string; thumbnail?: { source?: unknown }; extract?: unknown };
  const pages = ((data?.query?.pages ?? []) as Page[]).sort((a, b) => a.index - b.index);
  // Search returns loosely related pages: keep the best-ranked one whose title matches the query.
  const page = pages.find((p) => matches(query, p.title));
  if (!page) return null;
  return {
    imageUrl: typeof page.thumbnail?.source === "string" ? (page.thumbnail.source as string) : null,
    summary: typeof page.extract === "string" ? cleanSummary(page.extract) : null,
  };
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// At least one significant word of the query appears in the page title.
function matches(query: string, title: string) {
  const t = normalize(title);
  const words = normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  return words.length === 0 ? true : words.some((w) => t.includes(w));
}

// Drop disambiguation notes ("Ne pas confondre avec…", "Pour les autres lieux…").
function cleanSummary(extract: string) {
  const text = extract
    .split("\n")
    .filter((line) => !/^(ne pas confondre|pour les autres|pour l['’]article|cet article)/i.test(line.trim()))
    .join(" ")
    .trim();
  return text || null;
}

// Wikipedia lead images are often flags, maps or coats of arms: keep real photos only.
function isPhoto(url: string) {
  const file = decodeURIComponent(url.split("/").pop() ?? "").toLowerCase();
  return !/\.svg|flag|drapeau|map|carte|locator|location|blason|coat_of_arms|bandeira|projection/.test(file);
}

// Photo and title of a page (Airbnb listing, hotel, activity), from its Open Graph tags.
export async function pagePreview(pageUrl: string): Promise<{ imageUrl: string | null; title: string | null }> {
  try {
    const { body, finalUrl } = await safeGet(pageUrl);
    const rawImage = findMeta(body, ["og:image", "og:image:url", "twitter:image"]);
    let imageUrl: string | null = null;
    if (rawImage) {
      const image = new URL(decodeEntities(rawImage), finalUrl);
      if (image.protocol === "https:" || image.protocol === "http:") imageUrl = image.toString();
    }
    const rawTitle = findMeta(body, ["og:title", "twitter:title"]) ?? /<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1] ?? null;
    const title = rawTitle ? decodeEntities(rawTitle).replace(/\s+/g, " ").trim().slice(0, 90) || null : null;
    return { imageUrl, title };
  } catch {
    return { imageUrl: null, title: null };
  }
}

function decodeEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function findMeta(html: string, names: string[]) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!key || !names.includes(key)) continue;
    const content = /content\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (content) return content;
  }
  return null;
}

// --- Fetching user-supplied URLs without letting them reach internal services (SSRF) ---

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["224.0.0.0", 3],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}
// IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) are matched against the IPv4 rules by BlockList itself.

function isPublicAddress(address: string) {
  const family = isIP(address) === 6 ? "ipv6" : "ipv4";
  return !blocked.check(address, family);
}

// The address check happens inside the socket's own DNS lookup, so the
// validated IP is the one actually connected to (no DNS-rebinding window).
const safeLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as unknown as { address: string; family: number }[];
    const bad = list.find((a) => !isPublicAddress(a.address));
    if (bad || list.length === 0) return callback(new Error("Adresse non autorisée"), "", 0);
    if (options.all) return (callback as unknown as (e: null, a: typeof list) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

const MAX_BYTES = 1024 * 1024;

async function safeGet(rawUrl: string, redirectsLeft = 3): Promise<{ body: string; finalUrl: string }> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Protocole non autorisé");
  if (isIP(url.hostname.replace(/^\[|\]$/g, "")) && !isPublicAddress(url.hostname.replace(/^\[|\]$/g, ""))) {
    throw new Error("Adresse non autorisée");
  }
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.get(
      url,
      {
        lookup: safeLookup,
        timeout: 5000,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; TEE-voyages/0.1)",
          accept: "text/html",
          "accept-encoding": "identity",
          "accept-language": "fr-FR,fr;q=0.9",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft === 0) return reject(new Error("Trop de redirections"));
          return resolve(safeGet(new URL(res.headers.location, url).toString(), redirectsLeft - 1));
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${status}`));
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          chunks.push(chunk);
          // The <head> is enough to find og:image.
          if (size > MAX_BYTES) res.destroy();
        });
        res.on("close", () => resolve({ body: Buffer.concat(chunks).toString("utf8"), finalUrl: url.toString() }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Délai dépassé")));
    req.on("error", reject);
  });
}
