import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetCondition, AvailabilityStatus, RecommendedAction } from '../../common/enums';
import { Asset } from '../../entities/asset.entity';
import { Booking } from '../../entities/booking.entity';
import { LlmClient } from './llm.client';
import * as P from './prompts';

export interface ConditionAssessment {
  condition: AssetCondition;
  damageDescription: string;
  recommendedAction: RecommendedAction;
  confidence: number;
  aiGenerated: boolean;
}

export interface SmartSearchResult {
  aiRanked: boolean;
  queryInterpretation?: string;
  results: Array<{
    asset: Asset;
    rank: number;
    rationale?: string;
    predictedReturnDays?: number;
    available: boolean;
  }>;
}

/**
 * AI proxy service - the only place in the system that talks to an LLM.
 * The React frontend never calls an AI API directly (constraint 5.1).
 * Every feature has a deterministic fallback.
 */
@Injectable()
export class AiService {
  private logger = new Logger('AiService');

  constructor(
    private llm: LlmClient,
    @InjectRepository(Asset) private assets: Repository<Asset>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
  ) {}

  /** AI Feature 1 - natural-language smart search with ranked rationale. */
  async smartSearch(query: string): Promise<SmartSearchResult> {
    // Compact catalogue context: id, name, description, tags, availability,
    // plus average past booking duration for return-date prediction.
    const catalogue = await this.assets.find({ take: 120 });
    const durations = await this.avgBookingDays();
    const context = catalogue.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description?.slice(0, 160),
      category: a.category,
      tags: a.tags,
      available: a.availability === AvailabilityStatus.AVAILABLE,
      typicalBookingDays: durations.get(a.id) ?? 1,
    }));

    const ai = await this.llm.completeJson<{
      results: Array<{ assetId: string; rank: number; rationale: string; predictedReturnDays: number; available: boolean }>;
      queryInterpretation: string;
    }>(P.SMART_SEARCH_SYSTEM, P.smartSearchUser(query, context));

    if (ai?.results?.length) {
      const byId = new Map(catalogue.map((a) => [a.id, a]));
      const results = ai.results
        .filter((r) => byId.has(r.assetId))
        .map((r) => ({
          asset: byId.get(r.assetId),
          rank: r.rank,
          rationale: r.rationale,
          predictedReturnDays: r.predictedReturnDays,
          available: byId.get(r.assetId).availability === AvailabilityStatus.AVAILABLE,
        }));
      if (results.length)
        return { aiRanked: true, queryInterpretation: ai.queryInterpretation, results };
    }

    // Fallback: plain keyword search, no AI ranking (spec 4.1)
    const keyword = await this.assets
      .createQueryBuilder('a')
      .where(`a."searchVector" @@ plainto_tsquery('english', :q) OR a.name ILIKE :like OR a.description ILIKE :like`, {
        q: query,
        like: `%${query.split(' ')[0]}%`,
      })
      .take(10)
      .getMany();
    return {
      aiRanked: false,
      results: keyword.map((asset, i) => ({
        asset,
        rank: i + 1,
        available: asset.availability === AvailabilityStatus.AVAILABLE,
      })),
    };
  }

  /** AI Feature 2 - visual condition assessment from a return photo. */
  async assessCondition(input: {
    photoPath?: string;
    description: string;
    conditionAtBorrow: AssetCondition;
    assetName: string;
  }): Promise<ConditionAssessment | null> {
    const ai = await this.llm.completeJson<{
      condition: string;
      damageDescription: string;
      recommendedAction: string;
      confidence: number;
    }>(
      P.CONDITION_SYSTEM,
      P.conditionUser(input.assetName, input.conditionAtBorrow, input.description, !!input.photoPath),
      input.photoPath ? { path: input.photoPath } : undefined,
    );
    if (!ai || !Object.values(AssetCondition).includes(ai.condition as AssetCondition)) {
      // Fallback: no pre-fill; manager completes the form manually (spec 4.2)
      return null;
    }
    return {
      condition: ai.condition as AssetCondition,
      damageDescription: ai.damageDescription ?? '',
      recommendedAction: Object.values(RecommendedAction).includes(ai.recommendedAction as RecommendedAction)
        ? (ai.recommendedAction as RecommendedAction)
        : RecommendedAction.READY_FOR_REUSE,
      confidence: Math.min(1, Math.max(0, Number(ai.confidence) || 0.5)),
      aiGenerated: true,
    };
  }

  /** AI Feature 3 - study partner compatibility ranking. */
  async matchStudyPartners(
    me: { userId: string; modules: string[]; availableSlots: string[]; studyStyle: string },
    candidates: Array<{ userId: string; fullName: string; modules: string[]; availableSlots: string[]; studyStyle: string }>,
  ): Promise<{ aiRanked: boolean; matches: Array<{ userId: string; score: number; summary: string }> }> {
    if (candidates.length === 0) return { aiRanked: false, matches: [] };

    const ai = await this.llm.completeJson<{
      matches: Array<{ userId: string; score: number; summary: string }>;
    }>(P.STUDY_MATCH_SYSTEM, P.studyMatchUser(me, candidates));

    if (ai?.matches?.length) {
      const valid = new Set(candidates.map((c) => c.userId));
      const matches = ai.matches.filter((m) => valid.has(m.userId)).slice(0, 5);
      if (matches.length) return { aiRanked: true, matches };
    }

    // Fallback: deterministic overlap scoring (spec 4.3 static list)
    const matches = candidates
      .map((c) => {
        const moduleOverlap = c.modules.filter((m) => me.modules.includes(m)).length;
        const slotOverlap = c.availableSlots.filter((s) => me.availableSlots.includes(s)).length;
        const styleBonus = c.studyStyle === me.studyStyle ? 0.2 : 0;
        return {
          userId: c.userId,
          score: Math.min(1, moduleOverlap * 0.3 + slotOverlap * 0.15 + styleBonus),
          summary: `${moduleOverlap} shared module(s), ${slotOverlap} overlapping slot(s)`,
        };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return { aiRanked: false, matches };
  }

  /** AI-assisted lost/found pair matching (spec 3.5). */
  async matchLostFound(
    lost: Array<{ id: string; title: string; description: string; lastSeenLocation: string }>,
    found: Array<{ id: string; title: string; description: string; foundLocation: string }>,
  ): Promise<{ aiRanked: boolean; pairs: Array<{ lostReportId: string; foundItemId: string; confidence: number; reason: string }> }> {
    if (!lost.length || !found.length) return { aiRanked: false, pairs: [] };

    const ai = await this.llm.completeJson<{
      pairs: Array<{ lostReportId: string; foundItemId: string; confidence: number; reason: string }>;
    }>(P.LOSTFOUND_SYSTEM, P.lostFoundUser(lost, found));
    if (ai?.pairs?.length) return { aiRanked: true, pairs: ai.pairs };

    // Fallback: token-overlap heuristic
    const tokens = (s: string) => new Set(s.toLowerCase().split(/\W+/).filter((t) => t.length > 3));
    const pairs = [];
    for (const l of lost) {
      const lt = tokens(`${l.title} ${l.description}`);
      for (const f of found) {
        const ft = tokens(`${f.title} ${f.description}`);
        const overlap = [...lt].filter((t) => ft.has(t)).length;
        if (overlap >= 2)
          pairs.push({
            lostReportId: l.id,
            foundItemId: f.id,
            confidence: Math.min(0.9, overlap / 5),
            reason: `${overlap} shared descriptive terms`,
          });
      }
    }
    return { aiRanked: false, pairs: pairs.sort((a, b) => b.confidence - a.confidence).slice(0, 10) };
  }

  /** AI Feature 4 (bonus) - utilisation anomaly analysis over 8 weeks. */
  async detectAnomalies(stats: unknown) {
    const ai = await this.llm.completeJson<{
      bottlenecks: Array<{ assetId: string; name: string; recommendation: string }>;
      idle: Array<{ assetId: string; name: string; recommendation: string }>;
      summary: string;
    }>(P.ANOMALY_SYSTEM, P.anomalyUser(stats));
    return ai; // null → cron logs "AI unavailable" and skips the weekly report
  }

  /** In-app help chatbot. Falls back to keyword-matched canned answers if AI is unavailable. */
  async chat(message: string, role: string, department: string | null): Promise<{ reply: string; aiGenerated: boolean }> {
    const reply = await this.llm.complete(P.HELP_CHAT_SYSTEM, P.helpChatUser(message, role, department));
    if (reply) return { reply: reply.trim(), aiGenerated: true };
    return { reply: this.cannedHelpReply(message), aiGenerated: false };
  }

  private cannedHelpReply(message: string): string {
    const m = message.toLowerCase();
    const topics: Array<[RegExp, string]> = [
      [/book|reserve|slot|calendar/, 'Go to Catalogue, open an asset, and pick a start and end hour on its booking calendar. High-value assets need manager approval; you\'ll be notified as soon as it\'s decided.'],
      [/return|condition|inspect/, 'Open My Bookings and use "Return item" on an active booking - upload a photo and a short note and the condition report is pre-filled automatically.'],
      [/lend|borrow|loan/, 'Peer Lending lets you list your own items or borrow from other students. Both sides rate each other afterwards, which affects lending access.'],
      [/lost|found/, 'Use Lost & Found to report a lost item or browse items that have been logged - matches get suggested automatically for officers to confirm.'],
      [/study|partner|group/, 'Save your modules, free time slots and study style on the Study Groups page, then use "Find partners" - a match only exchanges contact details once both people accept.'],
      [/password|login|account|register|sign/, 'Use the eye icon on the password field to check what you typed. Forgot your details entirely? You\'ll need to register again or ask an admin to check your account.'],
      [/price|cost|value|pkr|rs\.?\s?\d/, 'Asset values are shown in PKR. Assets above the configured threshold require manager approval before a booking is confirmed.'],
      [/admin|analytic|dashboard|report/, 'Admins get an Analytics dashboard with utilisation, demand, approval turnaround and lending charts, plus a weekly AI report on bottleneck and idle assets.'],
    ];
    for (const [pattern, answer] of topics) if (pattern.test(m)) return answer;
    return "I can help with booking assets, returning items, peer lending, lost & found, study groups, or your account. Could you tell me a bit more about what you're trying to do?";
  }

  private async avgBookingDays(): Promise<Map<string, number>> {
    const rows = await this.bookings
      .createQueryBuilder('b')
      .select('b.assetId', 'assetId')
      .addSelect('AVG(EXTRACT(EPOCH FROM (b.endsAt - b.startsAt)) / 86400)', 'days')
      .groupBy('b.assetId')
      .getRawMany();
    return new Map(rows.map((r) => [r.assetId, Math.max(1, Math.round(Number(r.days)))]));
  }
}
