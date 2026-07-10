export enum Role {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  LOST_FOUND_OFFICER = 'LOST_FOUND_OFFICER',
  ADMIN = 'ADMIN',
}

export enum AssetCategory {
  LAB_EQUIPMENT = 'LAB_EQUIPMENT',
  AV_GEAR = 'AV_GEAR',
  STUDY_ROOM = 'STUDY_ROOM',
  TEXTBOOK = 'TEXTBOOK',
  BICYCLE = 'BICYCLE',
  SPORTS = 'SPORTS',
  OTHER = 'OTHER',
}

export enum AssetKind {
  PHYSICAL_ITEM = 'PHYSICAL_ITEM',
  ROOM = 'ROOM',
  LOANABLE_GOOD = 'LOANABLE_GOOD',
}

export enum AssetCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  DAMAGED = 'DAMAGED',
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
}

export enum LoanStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  DISPUTED = 'DISPUTED',
}

export enum LostItemStatus {
  OPEN = 'OPEN',
  MATCHED = 'MATCHED',
  CLAIMED = 'CLAIMED',
  CLOSED = 'CLOSED',
}

export enum FoundItemStatus {
  LOGGED = 'LOGGED',
  MATCHED = 'MATCHED',
  RETURNED = 'RETURNED',
  DONATION_FLAGGED = 'DONATION_FLAGGED',
}

export enum StudyStyle {
  SOLO = 'SOLO',
  GROUP = 'GROUP',
  DISCUSSION = 'DISCUSSION',
}

export enum MatchStatus {
  PROPOSED = 'PROPOSED',
  ACCEPTED_BY_ONE = 'ACCEPTED_BY_ONE',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
}

export enum RecommendedAction {
  READY_FOR_REUSE = 'READY_FOR_REUSE',
  NEEDS_REPAIR = 'NEEDS_REPAIR',
  RETIRE = 'RETIRE',
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  departmentId: string | null;
  faculty: string | null;
}
