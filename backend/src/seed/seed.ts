/**
 * Demo seed for Meridian University - run with `npm run seed`.
 * Creates departments, users across all roles, a large asset catalogue with
 * photos, an 8-week booking history (for analytics + the anomaly detector),
 * peer lending activity, lost & found reports and study profiles.
 * All demo passwords: Password123!
 */
import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { Asset } from '../entities/asset.entity';
import { Booking } from '../entities/booking.entity';
import { LendingListing, LoanRating, LoanRequest } from '../entities/lending.entity';
import { FoundItem, LostReport } from '../entities/lostfound.entity';
import { StudyProfile } from '../entities/study.entity';
import { CommunityPost, PostComment, PostLike } from '../entities/community.entity';
import {
  AssetCategory,
  AssetCondition,
  AssetKind,
  BookingStatus,
  FoundItemStatus,
  LoanStatus,
  LostItemStatus,
  RecommendedAction,
  Role,
  StudyStyle,
} from '../common/enums';

const DAY = 86400_000;
const pick = <T>(arr: T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length];

async function main() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  const em = AppDataSource.manager;

  if (await em.count(User)) {
    console.log('Database already seeded - skipping.');
    process.exit(0);
  }

  // ── departments (9 departments across 5 faculties) ──
  const deptData = [
    { name: 'Computer Science', faculty: 'Engineering & Technology', building: 'Block A' },
    { name: 'Electrical Engineering', faculty: 'Engineering & Technology', building: 'Block A' },
    { name: 'Media & Film', faculty: 'Arts & Humanities', building: 'Block C' },
    { name: 'Fine Arts', faculty: 'Arts & Humanities', building: 'Block C' },
    { name: 'Physics', faculty: 'Natural Sciences', building: 'Block B' },
    { name: 'Chemistry', faculty: 'Natural Sciences', building: 'Block B' },
    { name: 'Business Administration', faculty: 'Business & Management', building: 'Block D' },
    { name: 'Library Services', faculty: 'Central Services', building: 'Main Library' },
    { name: 'Sports Centre', faculty: 'Central Services', building: 'Sports Complex' },
  ];
  const departments = await em.save(Department, deptData);
  const [cs, ee, media, arts, physics, chem, biz, library, sports] = departments;

  // ── users ──
  const hash = await bcrypt.hash('Password123!', 10);
  const studentSeed = [
    { email: 'aftab@szabist.edu.pk', fullName: 'Aftab Ahmed Samoo', departmentId: cs.id, studentNumber: '2312398' },
    { email: 'javeria@szabist.edu.pk', fullName: 'Javeria Masroor', departmentId: media.id, studentNumber: '2312400' },
    { email: 'laiba@szabist.edu.pk', fullName: 'Laiba Aamir', departmentId: cs.id, studentNumber: '2312398' },
    { email: 'hassan.raza@szabist.edu.pk', fullName: 'Hassan Raza', departmentId: ee.id, studentNumber: '2312410' },
    { email: 'ayesha.tariq@szabist.edu.pk', fullName: 'Ayesha Tariq', departmentId: physics.id, studentNumber: '2312415' },
    { email: 'bilal.qureshi@szabist.edu.pk', fullName: 'Bilal Qureshi', departmentId: cs.id, studentNumber: '2312420' },
    { email: 'fatima.sheikh@szabist.edu.pk', fullName: 'Fatima Sheikh', departmentId: media.id, studentNumber: '2312422' },
    { email: 'usman.malik@szabist.edu.pk', fullName: 'Usman Malik', departmentId: chem.id, studentNumber: '2312430' },
    { email: 'zara.iqbal@szabist.edu.pk', fullName: 'Zara Iqbal', departmentId: biz.id, studentNumber: '2312435' },
    { email: 'hamza.khan@szabist.edu.pk', fullName: 'Hamza Khan', departmentId: ee.id, studentNumber: '2312440' },
    { email: 'sana.abbasi@szabist.edu.pk', fullName: 'Sana Abbasi', departmentId: arts.id, studentNumber: '2312444' },
    { email: 'ali.jaffer@szabist.edu.pk', fullName: 'Ali Jaffer', departmentId: cs.id, studentNumber: '2312450' },
  ];
  const users = await em.save(User, [
    ...studentSeed.map((s) => ({ ...s, passwordHash: hash, role: Role.STUDENT })),
    { email: 'sara.malik@szabist.pk', passwordHash: hash, fullName: 'Sara Malik', role: Role.STAFF, departmentId: cs.id },
    { email: 'imran.farooq@szabist.pk', passwordHash: hash, fullName: 'Imran Farooq', role: Role.STAFF, departmentId: media.id },
    { email: 'nadia.hussain@szabist.pk', passwordHash: hash, fullName: 'Nadia Hussain', role: Role.STAFF, departmentId: physics.id },
    { email: 'officer@szabist.pk', passwordHash: hash, fullName: 'Bilal Khan', role: Role.LOST_FOUND_OFFICER, departmentId: library.id },
    { email: 'admin@szabist.pk', passwordHash: hash, fullName: 'Admin', role: Role.ADMIN, departmentId: cs.id },
  ]);
  const students = users.filter((u) => u.role === Role.STUDENT);
  const staff = users.filter((u) => u.role === Role.STAFF);
  const admin = users.find((u) => u.role === Role.ADMIN)!;
  const officer = users.find((u) => u.role === Role.LOST_FOUND_OFFICER)!;
  const staffAndAdmin = [...staff, admin];

  // ── asset catalogue (31 assets, PKR pricing, real product photos incl. local Pakistani items) ──
  const assetData: Partial<Asset>[] = [
    { name: 'Zoom H6 Audio Recorder', description: 'Six-track portable recorder, ideal for interviews, podcasts and documentary field audio.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['audio', 'recording', 'microphone', 'podcast'], value: 95000, condition: AssetCondition.EXCELLENT, photoUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&q=80' },
    { name: 'Sony FX3 Cinema Camera', description: 'Full-frame cinema camera with 4K 120fps. High-value: booking requires manager approval.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['camera', 'video', 'film', '4k'], value: 1050000, condition: AssetCondition.GOOD, bookingLeadTimeHours: 24, photoUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80' },
    { name: 'Oscilloscope Keysight DSOX1204A', description: '4-channel 70MHz oscilloscope for circuits lab work.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.PHYSICAL_ITEM, departmentId: physics.id, tags: ['electronics', 'lab', 'measurement'], value: 250000, condition: AssetCondition.GOOD, photoUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80' },
    { name: 'Study Room L2-04', description: 'Quiet 6-seat study room on Library level 2 with whiteboard and HDMI screen.', category: AssetCategory.STUDY_ROOM, kind: AssetKind.ROOM, departmentId: library.id, tags: ['room', 'group study', 'whiteboard'], attributes: { capacity: 6, floor: 2 }, photoUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80' },
    { name: 'Study Room L3-11', description: 'Single-person focus pod on Library level 3.', category: AssetCategory.STUDY_ROOM, kind: AssetKind.ROOM, departmentId: library.id, tags: ['room', 'solo study', 'quiet'], attributes: { capacity: 1, floor: 3 }, photoUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80' },
    { name: 'MacBook Pro 16 (Loaner #7)', description: 'M3 Pro laptop with Adobe CC and Xcode installed. Loanable for up to 5 days.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.LOANABLE_GOOD, departmentId: cs.id, tags: ['laptop', 'macbook', 'development'], value: 700000, bookingLeadTimeHours: 12, photoUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80' },
    { name: 'Campus Bicycle #12', description: 'City bike with lock and lights, for on-campus and city trips.', category: AssetCategory.BICYCLE, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['bike', 'transport', 'cycling'], value: 60000, condition: AssetCondition.FAIR, photoUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80' },
    { name: 'Introduction to Algorithms (CLRS) 4th ed.', description: 'Course textbook for CS301 Algorithms, hardcover.', category: AssetCategory.TEXTBOOK, kind: AssetKind.LOANABLE_GOOD, departmentId: library.id, tags: ['book', 'algorithms', 'cs301'], value: 15000, photoUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80' },
    { name: 'DJI Mini 4 Pro Drone', description: 'Lightweight drone for aerial footage. Pilot briefing required. High-value asset.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['drone', 'aerial', 'video'], value: 310000, bookingLeadTimeHours: 48, photoUrl: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80' },
    { name: 'Rode Wireless GO II Mic Kit', description: 'Dual-channel wireless lavalier microphone set for video shoots.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['audio', 'microphone', 'wireless', 'lavalier'], value: 85000, photoUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80' },
    { name: '3D Printer Prusa MK4', description: 'FDM 3D printer, PLA/PETG. Book a slot and bring your own filament or buy at the lab.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.PHYSICAL_ITEM, departmentId: cs.id, tags: ['3d printing', 'prototyping', 'maker'], value: 210000, photoUrl: 'https://images.unsplash.com/photo-1615840287214-7ff58936c4cf?w=800&q=80' },
    { name: 'Projector Epson EB-2250U', description: 'Portable WUXGA projector for presentations and screenings.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: library.id, tags: ['projector', 'presentation'], value: 135000, photoUrl: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800&q=80' },
    { name: 'Digital Multimeter Fluke 117', description: 'True-RMS multimeter for electrical measurement labs.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.PHYSICAL_ITEM, departmentId: ee.id, tags: ['electronics', 'multimeter', 'lab'], value: 45000, photoUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&q=80' },
    { name: 'Function Generator Rigol DG1022', description: 'Dual-channel arbitrary waveform generator for signal labs.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.PHYSICAL_ITEM, departmentId: ee.id, tags: ['electronics', 'signal', 'lab'], value: 130000, photoUrl: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800&q=80' },
    { name: 'Study Room B1-02 (Business Wing)', description: 'Meeting-style room with a round table for case study discussions.', category: AssetCategory.STUDY_ROOM, kind: AssetKind.ROOM, departmentId: biz.id, tags: ['room', 'group study', 'meeting'], attributes: { capacity: 8, floor: 1 }, photoUrl: 'https://images.unsplash.com/photo-1499244571948-7ccddb3583f1?w=800&q=80' },
    { name: 'Canon EOS R6 Mirrorless Camera', description: 'Full-frame mirrorless camera for photography coursework and campus media.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: arts.id, tags: ['camera', 'photography'], value: 520000, bookingLeadTimeHours: 24, photoUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80' },
    { name: 'Campus Bicycle #05', description: 'City bike with lock, front basket included.', category: AssetCategory.BICYCLE, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['bike', 'transport'], value: 58000, condition: AssetCondition.GOOD, photoUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80' },
    { name: 'Organic Chemistry (Clayden) 3rd ed.', description: 'Reference textbook for CHEM201, some annotations.', category: AssetCategory.TEXTBOOK, kind: AssetKind.LOANABLE_GOOD, departmentId: library.id, tags: ['book', 'chemistry'], value: 18000, photoUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80' },
    { name: 'Badminton Racket Set (x4)', description: 'Set of four rackets and a tube of shuttlecocks, for the sports complex courts.', category: AssetCategory.SPORTS, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['sports', 'badminton'], value: 22000, photoUrl: 'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&q=80' },
    { name: 'Dell Precision Workstation (Loaner #2)', description: 'CAD/simulation workstation with RTX GPU, for EE senior projects.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.LOANABLE_GOOD, departmentId: ee.id, tags: ['workstation', 'cad', 'gpu'], value: 610000, bookingLeadTimeHours: 12, photoUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80' },
    { name: 'Study Room L1-07', description: 'Ground floor group room near the entrance, popular for quick sessions.', category: AssetCategory.STUDY_ROOM, kind: AssetKind.ROOM, departmentId: library.id, tags: ['room', 'group study'], attributes: { capacity: 4, floor: 1 }, photoUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80' },
    { name: 'Data Structures & Algorithms Kit (Whiteboard + Markers)', description: 'Portable whiteboard kit for peer tutoring sessions.', category: AssetCategory.OTHER, kind: AssetKind.LOANABLE_GOOD, departmentId: cs.id, tags: ['whiteboard', 'tutoring'], value: 12000, photoUrl: 'https://images.unsplash.com/photo-1499244571948-7ccddb3583f1?w=800&q=80' },
    { name: 'Ring Light + Tripod Kit', description: 'Continuous lighting kit for video interviews and content shoots.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['lighting', 'video'], value: 38000, photoUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80' },
    { name: 'Campus Bicycle #21', description: 'Mountain-style campus bike, good for the hillside route to the sports complex.', category: AssetCategory.BICYCLE, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['bike', 'transport'], value: 63000, condition: AssetCondition.EXCELLENT, photoUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80' },
    { name: 'Cricket Kit (Bat, Ball & Pads)', description: 'Full tape-ball and hardball cricket set with an English willow bat, batting pads and gloves, for the sports complex ground.', category: AssetCategory.SPORTS, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['cricket', 'sports', 'bat', 'ball'], value: 32000, condition: AssetCondition.GOOD, photoUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80' },
    { name: 'Field Hockey Stick Set (x4)', description: 'Composite field hockey sticks for Pakistan\'s national sport, sized for the outdoor astro-turf court.', category: AssetCategory.SPORTS, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['hockey', 'sports', 'national game'], value: 28000, condition: AssetCondition.GOOD, photoUrl: 'https://images.unsplash.com/photo-1541983663620-7571a820610c?w=800&q=80' },
    { name: 'Squash Racket & Ball Kit', description: 'Two squash rackets and a tube of dot balls for the indoor squash court, in the tradition of Pakistan\'s legendary squash players.', category: AssetCategory.SPORTS, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['squash', 'sports', 'racket'], value: 19000, condition: AssetCondition.EXCELLENT, photoUrl: 'https://images.unsplash.com/photo-1599280174407-fdc3e8c47856?w=800&q=80' },
    { name: 'Carrom Board (Common Room)', description: 'Classic wooden carrom board with strikers and coins, a hostel and common-room favourite between classes.', category: AssetCategory.OTHER, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['carrom', 'indoor games', 'common room'], value: 8500, condition: AssetCondition.GOOD, photoUrl: 'https://images.unsplash.com/photo-1617300067484-314ed2cfd9a6?w=800&q=80' },
    { name: 'Pakistan Studies & Everyday Science (Ikram Rabbani)', description: 'Standard reference textbook for the compulsory Pakistan Studies course, widely used across Pakistani universities.', category: AssetCategory.TEXTBOOK, kind: AssetKind.LOANABLE_GOOD, departmentId: library.id, tags: ['book', 'pakistan studies', 'compulsory course'], value: 9000, photoUrl: 'https://images.unsplash.com/photo-1529590003495-b2646e2718bf?w=800&q=80' },
    { name: 'Sohrab City Bicycle', description: 'Locally manufactured Sohrab city bike with lock and carrier rack, a familiar sight on campuses across Pakistan.', category: AssetCategory.BICYCLE, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['bike', 'transport', 'sohrab', 'local brand'], value: 42000, condition: AssetCondition.GOOD, photoUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80' },
  ];
  const savedAssets = await em.save(Asset, assetData.map((a) => em.create(Asset, a)));

  // ── bookings: 8-week history so utilisation, demand ranking, approval
  //    turnaround and the AI anomaly detector all have real data to show ──
  const now = Date.now();
  const bookingRows: Partial<Booking>[] = [];
  savedAssets.forEach((asset, ai) => {
    if (asset.kind === AssetKind.ROOM && ai % 3 !== 0) return; // keep rooms lighter
    const demand = ai < 3 ? 7 : ai < 9 ? 4 : ai < 17 ? 2 : ai < 22 ? 1 : 0;
    for (let b = 0; b < demand; b++) {
      const weeksAgo = b; // always < 8, guarantees distinct calendar weeks -> no overlap
      const start = new Date(now - weeksAgo * 7 * DAY);
      start.setUTCHours(9 + (b % 6), 0, 0, 0);
      const durationHrs = 1 + (b % 3);
      const end = new Date(start.getTime() + durationHrs * 3600_000);
      const requester = pick(students, ai + b * 3);
      const decider = pick(staffAndAdmin, ai + b);

      let status: BookingStatus;
      let decidedById: string | undefined;
      let decidedAt: Date | undefined;
      let conditionAtReturn: AssetCondition | undefined;
      let recommendedAction: RecommendedAction | undefined;
      let returnNotes: string | undefined;

      if (weeksAgo === 0) {
        status = b % 3 === 0 ? BookingStatus.PENDING : b % 3 === 1 ? BookingStatus.APPROVED : BookingStatus.ACTIVE;
        if (status !== BookingStatus.PENDING) {
          decidedById = decider.id;
          decidedAt = new Date(start.getTime() - 3 * 3600_000);
        }
      } else if (b % 6 === 5) {
        status = BookingStatus.DECLINED;
        decidedById = decider.id;
        decidedAt = new Date(start.getTime() - 3 * 3600_000);
      } else {
        status = BookingStatus.RETURNED;
        decidedById = decider.id;
        decidedAt = new Date(start.getTime() - 3 * 3600_000);
        const leaveForInspection = ai % 5 === 0 && b === 1; // populate the inspection queue
        if (!leaveForInspection) {
          conditionAtReturn = pick(
            [AssetCondition.EXCELLENT, AssetCondition.GOOD, AssetCondition.GOOD, AssetCondition.FAIR],
            ai + b,
          );
          recommendedAction =
            conditionAtReturn === AssetCondition.FAIR ? RecommendedAction.NEEDS_REPAIR : RecommendedAction.READY_FOR_REUSE;
          returnNotes = 'Returned in expected condition after coursework use.';
        }
      }

      bookingRows.push({
        assetId: asset.id,
        requesterId: requester.id,
        startsAt: start,
        endsAt: end,
        status,
        purpose: 'Coursework / project use',
        decidedById,
        decidedAt,
        conditionAtBorrow: asset.condition,
        conditionAtReturn,
        recommendedAction,
        returnNotes,
      });
    }
  });
  await em.save(Booking, bookingRows.map((b) => em.create(Booking, b)));

  // ── peer lending: listings + loan requests across statuses + ratings ──
  const listings = await em.save(LendingListing, [
    em.create(LendingListing, { title: 'Casio FX-991EX Calculator', description: 'Scientific calculator, perfect for exams.', category: 'Electronics', ownerId: students[0].id, maxLoanDays: 14, photoUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80' }),
    em.create(LendingListing, { title: 'Operating System Concepts (Silberschatz)', description: '10th edition, some highlights inside.', category: 'Textbooks', ownerId: students[1].id, maxLoanDays: 21, photoUrl: 'https://images.unsplash.com/photo-1499244571948-7ccddb3583f1?w=800&q=80' }),
    em.create(LendingListing, { title: 'Skateboard (7.75")', description: 'Good campus cruiser, new wheels.', category: 'Transport', ownerId: students[2].id, maxLoanDays: 7, photoUrl: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=800&q=80' }),
    em.create(LendingListing, { title: 'TI-84 Plus Graphing Calculator', description: 'Great for stats and calculus courses.', category: 'Electronics', ownerId: students[3].id, maxLoanDays: 14, photoUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80' }),
    em.create(LendingListing, { title: 'Discrete Mathematics (Rosen) 8th ed.', description: 'Course text for CS210, clean copy.', category: 'Textbooks', ownerId: students[5].id, maxLoanDays: 21, photoUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80' }),
    em.create(LendingListing, { title: 'Badminton Racket (Personal)', description: 'Lightweight racket, decent grip left.', category: 'Sports', ownerId: students[9].id, maxLoanDays: 5, photoUrl: 'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&q=80' }),
  ]);

  const loanRows = [
    { listingId: listings[0].id, borrowerId: students[4].id, status: LoanStatus.RETURNED, dueAt: new Date(now - 20 * DAY) },
    { listingId: listings[1].id, borrowerId: students[6].id, status: LoanStatus.ACTIVE, dueAt: new Date(now + 5 * DAY) },
    { listingId: listings[2].id, borrowerId: students[7].id, status: LoanStatus.OVERDUE, dueAt: new Date(now - 3 * DAY), escalationLevel: 2 },
    { listingId: listings[3].id, borrowerId: students[8].id, status: LoanStatus.REQUESTED, dueAt: new Date(now + 14 * DAY) },
    { listingId: listings[4].id, borrowerId: students[10].id, status: LoanStatus.RETURNED, dueAt: new Date(now - 10 * DAY) },
    { listingId: listings[5].id, borrowerId: students[0].id, status: LoanStatus.DECLINED, dueAt: new Date(now - 8 * DAY) },
  ];
  const savedLoans = await em.save(LoanRequest, loanRows.map((l) => em.create(LoanRequest, l)));

  await em.save(LoanRating, [
    em.create(LoanRating, { loanId: savedLoans[0].id, raterId: students[4].id, ratedUserId: students[0].id, score: 5, comment: 'Great condition, right on time.' }),
    em.create(LoanRating, { loanId: savedLoans[0].id, raterId: students[0].id, ratedUserId: students[4].id, score: 5, comment: 'Returned early, very careful.' }),
    em.create(LoanRating, { loanId: savedLoans[4].id, raterId: students[10].id, ratedUserId: students[5].id, score: 4, comment: 'Good book, minor wear.' }),
  ]);
  for (const [ratedUserId, score] of [[students[0].id, 5], [students[4].id, 5], [students[5].id, 4]] as const) {
    // keep reputation numbers in sync with the ratings above
    const u = await em.findOne(User, { where: { id: ratedUserId } });
    if (u) {
      const total = u.reputationScore * u.ratingsCount + score;
      const count = u.ratingsCount + 1;
      await em.update(User, ratedUserId, { reputationScore: Math.round((total / count) * 100) / 100, ratingsCount: count });
    }
  }

  // ── lost & found ──
  const lostReports = await em.save(LostReport, [
    em.create(LostReport, { title: 'Blue Nike Backpack', description: 'Navy backpack with a laptop sleeve and a keychain charm on the front zip.', lastSeenLocation: 'Library level 2, near the printers', reporterId: students[1].id, photoUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80' }),
    em.create(LostReport, { title: 'Silver Water Bottle', description: 'Stainless steel bottle with a CS department sticker.', lastSeenLocation: 'CS Building, Lab 3', reporterId: students[6].id }),
    em.create(LostReport, { title: 'Black Wired Earphones', description: 'Sony earphones in a small black pouch.', lastSeenLocation: 'Cafeteria, near the vending machines', reporterId: students[9].id }),
  ]);
  await em.save(FoundItem, [
    em.create(FoundItem, { title: 'Navy Backpack with Laptop Sleeve', description: 'Found on a study table, has a keychain charm attached.', foundLocation: 'Library level 2', conditionNotes: 'Good condition, slightly dusty.', loggedById: officer.id, status: FoundItemStatus.MATCHED, matchedLostReportId: lostReports[0].id, photoUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80' }),
    em.create(FoundItem, { title: 'Grey Umbrella', description: 'Compact folding umbrella, no markings.', foundLocation: 'Main entrance', loggedById: officer.id }),
    em.create(FoundItem, { title: 'USB-C Charger Brick', description: '65W charger, white, no cable.', foundLocation: 'Study Room L1-07', loggedById: officer.id }),
  ]);
  await em.update(LostReport, lostReports[0].id, { status: LostItemStatus.MATCHED });

  // ── study profiles + matches ──
  await em.save(StudyProfile, [
    em.create(StudyProfile, { userId: students[0].id, modules: ['CS301 Algorithms', 'CS310 Web Technologies'], availableSlots: ['MON 14:00-16:00', 'WED 10:00-12:00'], studyStyle: StudyStyle.DISCUSSION }),
    em.create(StudyProfile, { userId: students[1].id, modules: ['CS310 Web Technologies', 'MF210 Film Editing'], availableSlots: ['MON 14:00-16:00', 'THU 15:00-17:00'], studyStyle: StudyStyle.GROUP }),
    em.create(StudyProfile, { userId: students[2].id, modules: ['CS301 Algorithms', 'CS310 Web Technologies'], availableSlots: ['WED 10:00-12:00', 'FRI 09:00-11:00'], studyStyle: StudyStyle.GROUP }),
    em.create(StudyProfile, { userId: students[3].id, modules: ['EE220 Circuits', 'CS301 Algorithms'], availableSlots: ['TUE 13:00-15:00', 'WED 10:00-12:00'], studyStyle: StudyStyle.DISCUSSION }),
    em.create(StudyProfile, { userId: students[5].id, modules: ['CS301 Algorithms', 'CS210 Discrete Math'], availableSlots: ['MON 14:00-16:00', 'FRI 09:00-11:00'], studyStyle: StudyStyle.GROUP }),
    em.create(StudyProfile, { userId: students[7].id, modules: ['CHEM201 Organic Chemistry'], availableSlots: ['TUE 13:00-15:00'], studyStyle: StudyStyle.SOLO }),
    em.create(StudyProfile, { userId: students[11].id, modules: ['CS310 Web Technologies', 'CS301 Algorithms'], availableSlots: ['WED 10:00-12:00', 'MON 14:00-16:00'], studyStyle: StudyStyle.DISCUSSION }),
  ]);

  // ── community feed (posts, staff announcement, comments, likes) ──
  const posts = await em.save(CommunityPost, [
    em.create(CommunityPost, {
      authorId: staff[0].id, isAnnouncement: true, pinned: true,
      content: 'Reminder: The campus library will stay open 24/7 during midterm week (14 to 21 July). Extra study rooms on Level 2 and 3 have been unlocked. Please carry your student ID at all times. Best of luck with your exams.',
    }),
    em.create(CommunityPost, {
      authorId: students[0].id,
      content: 'Anyone from CS have the CLRS textbook I can borrow this weekend? Midterm prep grind starts now. Study room L2-04 is free tonight if anyone wants to join.',
    }),
    em.create(CommunityPost, {
      authorId: students[6].id,
      content: 'Selling my old scientific calculator (Casio FX-991EX), works perfectly. Message me if interested, giving it away cheap before I graduate.',
    }),
    em.create(CommunityPost, {
      authorId: students[3].id,
      content: 'Cricket match this Sunday at the sports complex ground, 4pm. We have the kit booked through CampusLoop. Need two more players, drop a comment.',
    }),
    em.create(CommunityPost, {
      authorId: students[8].id,
      content: 'Lost and found tip: I left my water bottle in the cafeteria last week and got it back through the Lost & Found desk within a day. This app actually works.',
    }),
  ]);
  const comments = await em.save(PostComment, [
    em.create(PostComment, { postId: posts[1].id, authorId: students[2].id, content: 'I have the 4th edition, will bring it to the library tomorrow.' }),
    em.create(PostComment, { postId: posts[1].id, authorId: students[5].id, content: 'Count me in for the study room tonight.' }),
    em.create(PostComment, { postId: posts[3].id, authorId: students[9].id, content: 'I am in, played last week too.' }),
    em.create(PostComment, { postId: posts[0].id, authorId: students[0].id, content: 'Thank you, this helps a lot during exams.' }),
    em.create(PostComment, { postId: posts[3].id, authorId: students[3].id, content: `Great, thanks @${students[9].fullName}! I will bring the spare bat too.` }),
  ]);
  // a threaded reply (the post author thanks the first commenter, tagging them)
  await em.save(PostComment, [
    em.create(PostComment, {
      postId: posts[1].id,
      parentId: comments[0].id,
      authorId: students[0].id,
      content: `Lifesaver, thank you @${students[2].fullName}!`,
    }),
  ]);
  await em.save(PostLike, [
    em.create(PostLike, { postId: posts[0].id, userId: students[0].id }),
    em.create(PostLike, { postId: posts[0].id, userId: students[1].id }),
    em.create(PostLike, { postId: posts[0].id, userId: students[2].id }),
    em.create(PostLike, { postId: posts[0].id, userId: students[3].id }),
    em.create(PostLike, { postId: posts[1].id, userId: students[2].id }),
    em.create(PostLike, { postId: posts[1].id, userId: students[5].id }),
    em.create(PostLike, { postId: posts[3].id, userId: students[0].id }),
  ]);

  console.log('Seed complete.');
  console.log(`  ${departments.length} departments, ${users.length} users, ${savedAssets.length} assets, ${bookingRows.length} bookings, ${listings.length} lending listings, ${lostReports.length} lost reports, ${posts.length} community posts`);
  console.log('Logins (password for all: Password123!)');
  console.log('  student  aftab@szabist.edu.pk / javeria@szabist.edu.pk / laiba@szabist.edu.pk (+ 9 more)');
  console.log('  staff    sara.malik@szabist.pk / imran.farooq@szabist.pk / nadia.hussain@szabist.pk');
  console.log('  officer  officer@szabist.pk');
  console.log('  admin    admin@szabist.pk');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
