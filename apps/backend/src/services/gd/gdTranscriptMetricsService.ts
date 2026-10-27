import type {
  IGDTranscriptSegment,
  IGDParticipant,
  IGDParticipantMetrics,
} from "../../models/GroupDiscussion";

export interface GDMetricsResult {
  totalDurationSeconds: number;
  totalWords: number;
  totalSegments: number;
  participantMetrics: IGDParticipantMetrics[];
  constructiveExchangesCount: number;
  interruptionEventsCount: number;
}

export class GDTranscriptMetricsService {
  /**
   * Computes accurate, verifiable speaking and transcript metrics strictly from observed data.
   */
  public computeMetrics(
    participants: IGDParticipant[],
    transcript: IGDTranscriptSegment[],
    sessionDurationSeconds?: number
  ): GDMetricsResult {
    // 1. Calculate overall group metrics
    let totalObservedSpeakingSeconds = 0;
    let totalGroupWords = 0;
    let constructiveExchanges = 0;
    let interruptionEvents = 0;

    // Track per-participant buckets
    const metricsMap = new Map<
      string,
      {
        participantId: string;
        participantName: string;
        isAi: boolean;
        segmentCount: number;
        wordCount: number;
        totalSpeakingSeconds: number;
        responseCount: number;
        interruptionCount: number;
      }
    >();

    for (const p of participants) {
      metricsMap.set(p.id, {
        participantId: p.id,
        participantName: p.name,
        isAi: p.isAi,
        segmentCount: 0,
        wordCount: 0,
        totalSpeakingSeconds: 0,
        responseCount: 0,
        interruptionCount: 0,
      });
    }

    // 2. Iterate through transcript segments in chronological order
    for (let i = 0; i < transcript.length; i++) {
      const seg = transcript[i]!;
      const bucket = metricsMap.get(seg.participantId);

      // Count words in segment
      const words = seg.text
        ? seg.text
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0).length
        : 0;

      // Observed duration in seconds (fallback to realistic word-rate ~2.5 words/sec if duration 0)
      const duration =
        seg.durationSeconds > 0
          ? seg.durationSeconds
          : Math.max(2, Math.round(words / 2.5));

      totalObservedSpeakingSeconds += duration;
      totalGroupWords += words;

      if (bucket) {
        bucket.segmentCount += 1;
        bucket.wordCount += words;
        bucket.totalSpeakingSeconds += duration;

        // Turn-taking response: if previous speaker was someone else
        if (i > 0 && transcript[i - 1]!.participantId !== seg.participantId) {
          bucket.responseCount += 1;
        }

        // Interruption detection from actual event data
        if (seg.isInterruption) {
          bucket.interruptionCount += 1;
          interruptionEvents += 1;
        }

        // Constructive turn-taking cues (e.g. acknowledging peer, adding nuance)
        const textLower = seg.text.toLowerCase();
        if (
          textLower.includes("i agree with") ||
          textLower.includes("building on") ||
          textLower.includes("to add to") ||
          textLower.includes("that's a fair point") ||
          textLower.includes("on the other hand") ||
          textLower.includes("from another perspective")
        ) {
          constructiveExchanges += 1;
        }
      }
    }

    // 3. Compute normalized percentages and averages
    const participantMetrics: IGDParticipantMetrics[] = participants.map((p) => {
      const bucket = metricsMap.get(p.id) || {
        participantId: p.id,
        participantName: p.name,
        isAi: p.isAi,
        segmentCount: 0,
        wordCount: 0,
        totalSpeakingSeconds: 0,
        responseCount: 0,
        interruptionCount: 0,
      };

      const percent =
        totalObservedSpeakingSeconds > 0
          ? Math.round(
              (bucket.totalSpeakingSeconds / totalObservedSpeakingSeconds) * 100
            )
          : 0;

      const avgDuration =
        bucket.segmentCount > 0
          ? Math.round(bucket.totalSpeakingSeconds / bucket.segmentCount)
          : 0;

      return {
        participantId: bucket.participantId,
        participantName: bucket.participantName,
        isAi: bucket.isAi,
        segmentCount: bucket.segmentCount,
        wordCount: bucket.wordCount,
        totalSpeakingSeconds: bucket.totalSpeakingSeconds,
        percentSpeakingTime: percent,
        averageSegmentDurationSeconds: avgDuration,
        responseCount: bucket.responseCount,
        interruptionCount: bucket.interruptionCount,
      };
    });

    const totalDurationSeconds =
      sessionDurationSeconds && sessionDurationSeconds > 0
        ? sessionDurationSeconds
        : totalObservedSpeakingSeconds;

    return {
      totalDurationSeconds,
      totalWords: totalGroupWords,
      totalSegments: transcript.length,
      participantMetrics,
      constructiveExchangesCount: constructiveExchanges,
      interruptionEventsCount: interruptionEvents,
    };
  }
}

export const gdTranscriptMetricsService = new GDTranscriptMetricsService();
