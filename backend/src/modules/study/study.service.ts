import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { JwtPayload, MatchStatus, StudyStyle } from '../../common/enums';
import { StudyMatch, StudyProfile } from '../../entities/study.entity';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StudyService {
  constructor(
    @InjectRepository(StudyProfile) private profiles: Repository<StudyProfile>,
    @InjectRepository(StudyMatch) private matches: Repository<StudyMatch>,
    private ai: AiService,
    private notifications: NotificationsService,
  ) {}

  async upsertProfile(
    data: { modules: string[]; availableSlots: string[]; studyStyle: StudyStyle },
    user: JwtPayload,
  ) {
    let profile = await this.profiles.findOne({ where: { userId: user.sub } });
    if (profile) {
      Object.assign(profile, data, { seekingPartners: true });
    } else {
      profile = this.profiles.create({ ...data, userId: user.sub });
    }
    return this.profiles.save(profile);
  }

  myProfile(user: JwtPayload) {
    return this.profiles.findOne({ where: { userId: user.sub } });
  }

  /** AI Feature 3 - find compatible study partners, then propose matches. */
  async findMatches(user: JwtPayload) {
    const me = await this.profiles.findOne({ where: { userId: user.sub } });
    if (!me) throw new BadRequestException('Create your study profile first');

    const candidates = await this.profiles.find({
      where: { userId: Not(user.sub), seekingPartners: true },
    });

    const result = await this.ai.matchStudyPartners(
      {
        userId: me.userId,
        modules: me.modules,
        availableSlots: me.availableSlots,
        studyStyle: me.studyStyle,
      },
      candidates.map((c) => ({
        userId: c.userId,
        fullName: c.user?.fullName ?? 'Student',
        modules: c.modules,
        availableSlots: c.availableSlots,
        studyStyle: c.studyStyle,
      })),
    );

    const byUserId = new Map(candidates.map((c) => [c.userId, c]));
    return {
      aiRanked: result.aiRanked,
      matches: result.matches.map((m) => ({
        ...m,
        profile: byUserId.get(m.userId),
      })),
    };
  }

  /** Propose a match - both must accept before contact info is exchanged. */
  async propose(otherUserId: string, score: number, summary: string, user: JwtPayload) {
    if (otherUserId === user.sub) throw new BadRequestException('Cannot match with yourself');
    const existing = await this.matches.findOne({
      where: [
        { userAId: user.sub, userBId: otherUserId, status: Not(MatchStatus.DECLINED) },
        { userAId: otherUserId, userBId: user.sub, status: Not(MatchStatus.DECLINED) },
      ],
    });
    if (existing) return existing;

    const match = await this.matches.save(
      this.matches.create({
        userAId: user.sub,
        userBId: otherUserId,
        compatibilityScore: score,
        summary,
        acceptedBy: [user.sub],
        status: MatchStatus.ACCEPTED_BY_ONE,
      }),
    );
    // WebSocket notify the other student (spec 4.3)
    await this.notifications.notifyUser(
      otherUserId,
      'study-match',
      'New study partner proposal',
      summary || 'A student wants to study with you. Accept to exchange contact details.',
      { matchId: match.id },
    );
    return match;
  }

  async respond(matchId: string, accept: boolean, user: JwtPayload) {
    const match = await this.matches.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match not found');
    if (![match.userAId, match.userBId].includes(user.sub))
      throw new ForbiddenException('Not your match');

    if (!accept) {
      match.status = MatchStatus.DECLINED;
    } else {
      const accepted = new Set(match.acceptedBy ?? []);
      accepted.add(user.sub);
      match.acceptedBy = [...accepted];
      if (accepted.has(match.userAId) && accepted.has(match.userBId)) {
        match.status = MatchStatus.CONFIRMED;
        // Only now are contact details exchanged (spec 4.3)
        for (const uid of [match.userAId, match.userBId]) {
          await this.notifications.notifyUser(
            uid,
            'study-match',
            'Study match confirmed',
            'You both accepted - contact details are now visible on your matches page.',
            { matchId: match.id },
          );
        }
      }
    }
    return this.matches.save(match);
  }

  async myMatches(user: JwtPayload) {
    const list = await this.matches.find({
      where: [{ userAId: user.sub }, { userBId: user.sub }],
      order: { createdAt: 'DESC' },
    });
    // hide the other party's email until CONFIRMED
    return list.map((m) => {
      if (m.status !== MatchStatus.CONFIRMED) {
        if (m.userA) m.userA.email = undefined;
        if (m.userB) m.userB.email = undefined;
      }
      return m;
    });
  }
}
