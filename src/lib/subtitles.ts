import { SubtitleTrack, MediaType } from "@/types";

export interface SubtitleCue {
  id: string;
  startTime: number; // In seconds
  endTime: number; // In seconds
  text: string;
}

/**
 * Parses WebVTT timestamp (e.g. "00:01:23.456" or "01:23.456") to seconds.
 */
export function parseVttTimestamp(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseFloat(parts[0]);
    minutes = parseFloat(parts[1]);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseFloat(parts[0]);
    seconds = parseFloat(parts[1]);
  }
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parses raw WebVTT text into cue objects for real-time overlay playback.
 */
export function parseWebVttCues(vttContent: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = vttContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes("-->")) {
      const parts = line.split("-->").map((s) => s.trim());
      const startStr = parts[0];
      const endStr = parts[1].split(" ")[0]; // Ignore position/alignment flags

      const startTime = parseVttTimestamp(startStr);
      const endTime = parseVttTimestamp(endStr);
      const textLines: string[] = [];
      i++;

      while (i < lines.length && lines[i].trim() !== "") {
        // Strip cue style tags like <c.hebrew> or <b>
        const cleanLine = lines[i].replace(/<[^>]+>/g, "").trim();
        if (cleanLine) {
          textLines.push(cleanLine);
        }
        i++;
      }

      if (textLines.length > 0 && !isNaN(startTime) && !isNaN(endTime)) {
        cues.push({
          id: `cue-${cues.length}`,
          startTime,
          endTime,
          text: textLines.join("\n"),
        });
      }
    } else {
      i++;
    }
  }

  return cues;
}

/**
 * Searches and resolves available subtitles for a title with priority on Hebrew.
 */
export async function getHebrewSubtitles(options: {
  tmdbId: number;
  imdbId?: string;
  mediaType?: MediaType;
  season?: number;
  episode?: number;
}): Promise<SubtitleTrack[]> {
  const { tmdbId, imdbId, mediaType = "movie", season = 1, episode = 1 } = options;

  try {
    const params = new URLSearchParams({
      tmdbId: String(tmdbId),
      type: mediaType,
      season: String(season),
      episode: String(episode),
    });
    if (imdbId) params.append("imdbId", imdbId);

    const res = await fetch(`/api/subtitles/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.subtitles) && data.subtitles.length > 0) {
        return data.subtitles;
      }
    }
  } catch (err) {
    console.warn("Client subtitle search error, returning fallback tracks:", err);
  }

  // Multi-source default tracks
  return [
    {
      id: "he-auto",
      label: "עברית (ברירת מחדל)",
      language: "he",
      source: "manual",
      url: `/api/subtitles/download?tmdbId=${tmdbId}&type=${mediaType}&season=${season}&episode=${episode}`,
      isDefault: true,
    },
    {
      id: "en-auto",
      label: "English",
      language: "en",
      source: "manual",
      url: `/api/subtitles/download?tmdbId=${tmdbId}&type=${mediaType}&season=${season}&episode=${episode}&lang=en`,
    },
  ];
}
