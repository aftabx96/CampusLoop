/**
 * Demo seed for Meridian University — run with `npm run seed`.
 * Creates departments, one user per role, assets, listings and study profiles.
 * All demo passwords: Password123!
 */
import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { Asset } from '../entities/asset.entity';
import { LendingListing } from '../entities/lending.entity';
import { StudyProfile } from '../entities/study.entity';
import {
  AssetCategory,
  AssetCondition,
  AssetKind,
  Role,
  StudyStyle,
} from '../common/enums';

async function main() {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  const em = AppDataSource.manager;

  if (await em.count(User)) {
    console.log('Database already seeded — skipping.');
    process.exit(0);
  }

  const deptData = [
    { name: 'Computer Science', faculty: 'Engineering & Technology', building: 'Block A' },
    { name: 'Media & Film', faculty: 'Arts & Humanities', building: 'Block C' },
    { name: 'Physics', faculty: 'Natural Sciences', building: 'Block B' },
    { name: 'Library Services', faculty: 'Central Services', building: 'Main Library' },
    { name: 'Sports Centre', faculty: 'Central Services', building: 'Sports Complex' },
  ];
  const departments = await em.save(Department, deptData);
  const [cs, media, physics, library, sports] = departments;

  const hash = await bcrypt.hash('Password123!', 10);
  const users = await em.save(User, [
    { email: 'aftab@szabist.edu.pk', passwordHash: hash, fullName: 'Aftab Ahmed Samoo', role: Role.STUDENT, departmentId: cs.id, studentNumber: '2312398' },
    { email: 'javeria@szabist.edu.pk', passwordHash: hash, fullName: 'Javeria Masroor', role: Role.STUDENT, departmentId: media.id, studentNumber: '2312400' },
    { email: 'laiba@szabist.edu.pk', passwordHash: hash, fullName: 'Laiba Aamir', role: Role.STUDENT, departmentId: cs.id, studentNumber: '2312398' },
    { email: 'staff@meridian.edu', passwordHash: hash, fullName: 'Dr. Sara Malik (Lab Manager)', role: Role.STAFF, departmentId: cs.id },
    { email: 'officer@meridian.edu', passwordHash: hash, fullName: 'Bilal Khan (L&F Officer)', role: Role.LOST_FOUND_OFFICER, departmentId: library.id },
    { email: 'admin@meridian.edu', passwordHash: hash, fullName: 'Mustafa Hassan (Admin)', role: Role.ADMIN, departmentId: cs.id },
  ]);

  const assets: Partial<Asset>[] = [
    { name: 'Zoom H6 Audio Recorder', description: 'Six-track portable recorder, ideal for interviews, podcasts and documentary field audio.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['audio', 'recording', 'microphone', 'podcast'], value: 350, condition: AssetCondition.EXCELLENT },
    { name: 'Sony FX3 Cinema Camera', description: 'Full-frame cinema camera with 4K 120fps. High-value: booking requires manager approval.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['camera', 'video', 'film', '4k'], value: 3800, condition: AssetCondition.GOOD, bookingLeadTimeHours: 24 },
    { name: 'Oscilloscope Keysight DSOX1204A', description: '4-channel 70MHz oscilloscope for circuits lab work.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.PHYSICAL_ITEM, departmentId: physics.id, tags: ['electronics', 'lab', 'measurement'], value: 900, condition: AssetCondition.GOOD },
    { name: 'Study Room L2-04', description: 'Quiet 6-seat study room on Library level 2 with whiteboard and HDMI screen.', category: AssetCategory.STUDY_ROOM, kind: AssetKind.ROOM, departmentId: library.id, tags: ['room', 'group study', 'whiteboard'], attributes: { capacity: 6, floor: 2 } },
    { name: 'Study Room L3-11', description: 'Single-person focus pod on Library level 3.', category: AssetCategory.STUDY_ROOM, kind: AssetKind.ROOM, departmentId: library.id, tags: ['room', 'solo study', 'quiet'], attributes: { capacity: 1, floor: 3 } },
    { name: 'MacBook Pro 16 (Loaner #7)', description: 'M3 Pro laptop with Adobe CC and Xcode installed. Loanable for up to 5 days.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.LOANABLE_GOOD, departmentId: cs.id, tags: ['laptop', 'macbook', 'development'], value: 2500, bookingLeadTimeHours: 12 },
    { name: 'Campus Bicycle #12', description: 'City bike with lock and lights, for on-campus and city trips.', category: AssetCategory.BICYCLE, kind: AssetKind.LOANABLE_GOOD, departmentId: sports.id, tags: ['bike', 'transport', 'cycling'], value: 220, condition: AssetCondition.FAIR },
    { name: 'Introduction to Algorithms (CLRS) 4th ed.', description: 'Course textbook for CS301 Algorithms, hardcover.', category: AssetCategory.TEXTBOOK, kind: AssetKind.LOANABLE_GOOD, departmentId: library.id, tags: ['book', 'algorithms', 'cs301'], value: 90 },
    { name: 'DJI Mini 4 Pro Drone', description: 'Lightweight drone for aerial footage. Pilot briefing required. High-value asset.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['drone', 'aerial', 'video'], value: 1100, bookingLeadTimeHours: 48 },
    { name: 'Rode Wireless GO II Mic Kit', description: 'Dual-channel wireless lavalier microphone set for video shoots.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: media.id, tags: ['audio', 'microphone', 'wireless', 'lavalier'], value: 300 },
    { name: '3D Printer Prusa MK4', description: 'FDM 3D printer, PLA/PETG. Book a slot and bring your own filament or buy at the lab.', category: AssetCategory.LAB_EQUIPMENT, kind: AssetKind.PHYSICAL_ITEM, departmentId: cs.id, tags: ['3d printing', 'prototyping', 'maker'], value: 750 },
    { name: 'Projector Epson EB-2250U', description: 'Portable WUXGA projector for presentations and screenings.', category: AssetCategory.AV_GEAR, kind: AssetKind.PHYSICAL_ITEM, departmentId: library.id, tags: ['projector', 'presentation'], value: 480 },
  ];
  await em.save(Asset, assets.map((a) => em.create(Asset, a)));

  await em.save(LendingListing, [
    em.create(LendingListing, { title: 'Casio FX-991EX Calculator', description: 'Scientific calculator, perfect for exams.', category: 'Electronics', ownerId: users[0].id, maxLoanDays: 14 }),
    em.create(LendingListing, { title: 'Operating System Concepts (Silberschatz)', description: '10th edition, some highlights inside.', category: 'Textbooks', ownerId: users[1].id, maxLoanDays: 21 }),
    em.create(LendingListing, { title: 'Skateboard (7.75")', description: 'Good campus cruiser, new wheels.', category: 'Transport', ownerId: users[2].id, maxLoanDays: 7 }),
  ]);

  await em.save(StudyProfile, [
    em.create(StudyProfile, { userId: users[0].id, modules: ['CS301 Algorithms', 'CS310 Web Technologies'], availableSlots: ['MON 14:00-16:00', 'WED 10:00-12:00'], studyStyle: StudyStyle.DISCUSSION }),
    em.create(StudyProfile, { userId: users[1].id, modules: ['CS310 Web Technologies', 'MF210 Film Editing'], availableSlots: ['MON 14:00-16:00', 'THU 15:00-17:00'], studyStyle: StudyStyle.GROUP }),
    em.create(StudyProfile, { userId: users[2].id, modules: ['CS301 Algorithms', 'CS310 Web Technologies'], availableSlots: ['WED 10:00-12:00', 'FRI 09:00-11:00'], studyStyle: StudyStyle.GROUP }),
  ]);

  console.log('Seed complete.');
  console.log('Logins (password for all: Password123!)');
  console.log('  student  aftab@szabist.edu.pk / javeria@szabist.edu.pk / laiba@szabist.edu.pk');
  console.log('  staff    staff@meridian.edu');
  console.log('  officer  officer@meridian.edu');
  console.log('  admin    admin@meridian.edu');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
