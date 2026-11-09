import { NextRequest, NextResponse } from "next/server";
import zlib from "zlib";

export const dynamic = "force-dynamic";

/**
 * Extracts raw SRT buffer from a ZIP archive buffer without external dependencies.
 */
function extractSrtFromZip(zipBuf: Buffer<ArrayBufferLike>): Buffer<ArrayBufferLike> {
  let offset = 0;
  while (offset + 30 < zipBuf.length) {
    // Check for Local File Header signature (PK\x03\x04)
    if (
      zipBuf[offset] === 0x50 &&
      zipBuf[offset + 1] === 0x4b &&
      zipBuf[offset + 2] === 0x03 &&
      zipBuf[offset + 3] === 0x04
    ) {
      const compMethod = zipBuf.readUInt16LE(offset + 8);
      const compSize = zipBuf.readUInt32LE(offset + 18);
      const fileNameLen = zipBuf.readUInt16LE(offset + 26);
      const extraLen = zipBuf.readUInt16LE(offset + 28);
      const fileName = zipBuf.toString("utf8", offset + 30, offset + 30 + fileNameLen);
      const dataStart = offset + 30 + fileNameLen + extraLen;

      if (dataStart + compSize <= zipBuf.length) {
        const compressedSlice = zipBuf.subarray(dataStart, dataStart + compSize);

        if (compMethod === 8) {
          // Deflated
          try {
            const inflated = zlib.inflateRawSync(compressedSlice);
            if (fileName.toLowerCase().endsWith(".srt") || inflated.length > 50) {
              return inflated;
            }
          } catch {
            // Continue search
          }
        } else if (compMethod === 0) {
          // Stored
          if (fileName.toLowerCase().endsWith(".srt") || compSize > 50) {
            return Buffer.from(compressedSlice);
          }
        }
      }
      offset = dataStart + compSize;
    } else {
      offset++;
    }
  }
  return zipBuf;
}

/**
 * Detects Hebrew character encoding (Windows-1255 vs UTF-8 vs ISO-8859-8) and decodes to UTF-8.
 */
export function decodeHebrewBuffer(buffer: Buffer | Uint8Array, encodingHint?: string): string {
  // Normalize encoding hint (e.g. CP1255 -> windows-1255)
  const normHint = encodingHint?.toLowerCase().trim();
  const isWindows1255Hint =
    normHint === "windows-1255" || normHint === "cp1255" || normHint === "win1255";

  // 1. Check for UTF-8 Byte Order Mark (BOM)
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer.subarray(3));
  }

  // 2. If explicit Windows-1255 requested, prioritize it
  if (isWindows1255Hint) {
    try {
      const winDecoder = new TextDecoder("windows-1255");
      const decoded = winDecoder.decode(buffer);
      if (/[\u0590-\u05FF]/.test(decoded)) {
        return decoded;
      }
    } catch {
      // Fall through
    }
  }

  // 3. Test strict UTF-8 decoding
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    const text = utf8Decoder.decode(buffer);
    if (/[\u0590-\u05FF]/.test(text)) {
      return text;
    }
  } catch {
    // Non-UTF-8 bytes found, continue to single-byte checks
  }

  // 4. Test Windows-1255 byte pattern: Hebrew Alef (0xE0) to Tav (0xFA)
  let hebrewByteMatches = 0;
  const sampleLength = Math.min(2000, buffer.length);
  for (let i = 0; i < sampleLength; i++) {
    if (buffer[i] >= 0xe0 && buffer[i] <= 0xfa) {
      hebrewByteMatches++;
    }
  }

  if (hebrewByteMatches > 5) {
    try {
      const winDecoder = new TextDecoder("windows-1255");
      return winDecoder.decode(buffer);
    } catch {
      // Fall through
    }
  }

  // 5. Try ISO-8859-8
  try {
    const isoDecoder = new TextDecoder("iso-8859-8");
    const isoText = isoDecoder.decode(buffer);
    if (/[\u0590-\u05FF]/.test(isoText)) {
      return isoText;
    }
  } catch {
    // Fall through
  }

  // 6. Final UTF-8 fallback
  return new TextDecoder("utf-8").decode(buffer);
}

/**
 * Converts SRT subtitle text to compliant WebVTT format with Hebrew BiDi support.
 */
export function convertSrtToVtt(srtContent: string): string {
  let normalized = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Strip BOM if present
  if (normalized.charCodeAt(0) === 0xfeff) {
    normalized = normalized.slice(1);
  }

  // Convert SRT comma millisecond separator (00:01:23,456) to WebVTT dot (00:01:23.456)
  let vttBody = normalized.replace(
    /(\d{1,2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}),(\d{3})/g,
    (match, p1, p2, p3, p4) => {
      const h1 = p1.length === 7 ? `0${p1}` : p1;
      const h2 = p3.length === 7 ? `0${p3}` : p3;
      return `${h1}.${p2} --> ${h2}.${p4}`;
    }
  );

  // Strip non-standard font tags and unsupported formatting while preserving italics
  vttBody = vttBody.replace(/<font[^>]*>/gi, "").replace(/<\/font>/gi, "");

  // WebVTT with RTL cue style declarations to prevent reversed punctuation
  const vttHeader = `WEBVTT - Family Stream Synchronized Hebrew Subtitles

STYLE
::cue {
  background-color: rgba(0, 0, 0, 0.78);
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 1.15rem;
  line-height: 1.4;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  direction: rtl;
  unicode-bidi: plaintext;
}

`;

  return vttHeader + vttBody;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const directUrl = searchParams.get("url");
    const wizdomId = searchParams.get("wizdomId");
    const encodingHint = searchParams.get("encoding") || undefined;

    let rawBuffer: Buffer<ArrayBufferLike> | Uint8Array | null = null;

    if (wizdomId) {
      // Download from Wizdom API
      const wizdomUrl = `https://wizdom.xyz/api/files/sub/${wizdomId}`;
      const res = await fetch(wizdomUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`Failed to download Wizdom subtitle: HTTP ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const zipBuffer: Buffer<ArrayBufferLike> = Buffer.from(arrayBuffer);
      rawBuffer = extractSrtFromZip(zipBuffer);
    } else if (directUrl) {
      // Download from direct URL (e.g., Stremio CDN, OpenSubtitles GZ, Nova VTT)
      const res = await fetch(directUrl, {
        headers: {
          "User-Agent": "TemporaryUserAgent",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`Failed to download remote subtitle: HTTP ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      let buf: Buffer<ArrayBufferLike> = Buffer.from(arrayBuffer);

      // 1. Check if GZIP archive (magic bytes 0x1f 0x8b, e.g. OpenSubtitles .gz)
      if (buf[0] === 0x1f && buf[1] === 0x8b) {
        try {
          buf = zlib.gunzipSync(buf);
        } catch (e) {
          console.warn("Gzip decompression error:", e);
        }
      }
      // 2. Check if ZIP archive (magic bytes 0x50 0x4b 0x03 0x04)
      else if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
        buf = extractSrtFromZip(buf);
      }

      rawBuffer = buf;
    } else {
      // Fallback sample cue WebVTT for verification or fallback demo
      const fallbackVtt = `WEBVTT - Family Stream Synchronized Hebrew Subtitles

STYLE
::cue {
  background-color: rgba(0, 0, 0, 0.78);
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 1.15rem;
  line-height: 1.4;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  direction: rtl;
  unicode-bidi: plaintext;
}

1
00:00:02.000 --> 00:00:07.000
כתוביות בעברית - Family Stream

2
00:00:08.000 --> 00:00:14.000
סנכרון ותרגום אוטומטי פעיל
`;
      return new NextResponse(fallbackVtt, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }

    if (!rawBuffer || rawBuffer.length === 0) {
      return new NextResponse("WEBVTT\n\n", {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Decode buffer (Windows-1255 or UTF-8 to UTF-8 string)
    const textContent = decodeHebrewBuffer(rawBuffer, encodingHint);

    // Convert SRT to WebVTT if it starts as SRT
    let vttOutput: string;
    if (textContent.trim().startsWith("WEBVTT")) {
      vttOutput = textContent;
    } else {
      vttOutput = convertSrtToVtt(textContent);
    }

    return new NextResponse(vttOutput, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error downloading subtitle";
    return new NextResponse(`WEBVTT\n\nNOTE Error: ${message}\n`, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
