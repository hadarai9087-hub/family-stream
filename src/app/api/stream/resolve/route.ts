import { NextRequest, NextResponse } from "next/server";
import { resolveStreamSources, PROVIDER_TIERS } from "@/lib/streamResolvers";
import { MediaType } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tmdbIdParam = searchParams.get("tmdbId");
    const typeParam = searchParams.get("type") as MediaType | null;
    const seasonParam = searchParams.get("season");
    const episodeParam = searchParams.get("episode");
    const startAtParam = searchParams.get("startAt");
    const subtitleUrl = searchParams.get("subtitleUrl") || undefined;
    const subtitleLabel = searchParams.get("subtitleLabel") || undefined;

    if (!tmdbIdParam) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: tmdbId" },
        { status: 400 }
      );
    }

    const tmdbId = parseInt(tmdbIdParam, 10);
    if (isNaN(tmdbId) || tmdbId <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid tmdbId parameter" },
        { status: 400 }
      );
    }

    const mediaType: MediaType = typeParam === "tv" ? "tv" : "movie";
    const season = seasonParam ? Math.max(1, parseInt(seasonParam, 10) || 1) : 1;
    const episode = episodeParam ? Math.max(1, parseInt(episodeParam, 10) || 1) : 1;
    const startAt = startAtParam ? Math.max(0, parseInt(startAtParam, 10) || 0) : 0;

    const sources = resolveStreamSources({
      tmdbId,
      mediaType,
      season,
      episode,
      startAt,
      subtitleUrl,
      subtitleLabel,
    });

    const formattedSources = sources.map((src) => ({
      id: src.id || "source-unknown",
      name: src.name,
      tier: src.tier || 1,
      url: src.url,
      quality: src.quality || "HD",
      sandboxed: Boolean(src.sandboxed ?? true),
    }));

    return NextResponse.json(
      {
        success: true,
        tmdbId,
        mediaType,
        season: mediaType === "tv" ? season : undefined,
        episode: mediaType === "tv" ? episode : undefined,
        totalSources: formattedSources.length,
        tiers: PROVIDER_TIERS,
        sources: formattedSources,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
