/** Sample data used only for the on-page product preview. */

export const EVENT = {
  name: "HackNorthside 2026",
  org: "Northside Institute of Technology",
  venue: "Nexa Convention Hall · Hall B",
  dates: "14–16 February 2026",
  capacity: 1560,
  registered: 1284,
  teamSize: "2–4 members",
};

export const VERIFICATION_RECORD = [
  { label: "Email verified", detail: "events@northside.edu", state: "verified" as const },
  { label: "Organization reviewed", detail: "Northside Institute of Technology", state: "verified" as const },
  { label: "Representative authorized", detail: "Dr. R. Menon · Event lead", state: "verified" as const },
  { label: "Venue approval recorded", detail: "Nexa Convention Hall · Hall B", state: "verified" as const },
  { label: "Agreement accepted", detail: "Signed 14 Feb 2026 · v3", state: "verified" as const },
  { label: "Event dates confirmed", detail: "14–16 Feb · 3 halls blocked", state: "review" as const },
];

export const VENUE_CHECKS = [
  "Capacity confirmed: 1,200 seated",
  "Power & backup for 240 desks",
  "1 Gbps dedicated line + Wi-Fi 6",
  "Step-free access to Hall B",
  "Fire safety certificate on file",
];

export const TRACKS = [
  { name: "AI & Learning", teams: 46, tone: "cobalt" as const },
  { name: "Climate & Energy", teams: 38, tone: "sage" as const },
  { name: "Health Access", teams: 31, tone: "coral" as const },
  { name: "Open Track", teams: 52, tone: "amber" as const },
];

export const SCHEDULE = [
  { day: "Fri 14 Feb", time: "18:00", title: "Check-in and kickoff", done: true },
  { day: "Sat 15 Feb", time: "09:00", title: "Mentor checkpoint", done: true },
  { day: "Sat 15 Feb", time: "22:00", title: "Demo round", done: false },
  { day: "Sun 16 Feb", time: "13:00", title: "Submission deadline", done: false },
  { day: "Sun 16 Feb", time: "17:00", title: "Final results", done: false },
];

export const PARTICIPANTS = [
  { name: "Isha Raman", init: "IR", tone: "coral" as const, status: "Checked in" },
  { name: "Theo Alvarez", init: "TA", tone: "cobalt" as const, status: "Team lead" },
  { name: "Mira Okafor", init: "MO", tone: "sage" as const, status: "Checked in" },
  { name: "Kenji Sato", init: "KS", tone: "amber" as const, status: "Judge" },
  { name: "Noor Haddad", init: "NH", tone: "cobalt" as const, status: "Venue" },
];

export const TEAMS = [
  {
    name: "Null Pointer",
    members: 3,
    size: 4,
    track: "Climate & Energy",
    looking: "Need 1 · frontend or data",
    state: "open" as const,
  },
  {
    name: "Salt & Static",
    members: 4,
    size: 4,
    track: "AI & Learning",
    looking: "Full team",
    state: "full" as const,
  },
  {
    name: "Paper Boats",
    members: 2,
    size: 4,
    track: "Health Access",
    looking: "Need 2 · anyone curious",
    state: "open" as const,
  },
];

export const PROBLEM_STATEMENTS = [
  { code: "PS-04", title: "Cut campus peak load by 20%", claimed: "Null Pointer", selected: true },
  { code: "PS-11", title: "Clinic queue triage for rural posts", claimed: "Paper Boats", selected: false },
  { code: "PS-07", title: "Sign-language notes for lectures", claimed: "Unclaimed", selected: false },
];

export const PROJECTS = [
  {
    name: "GridGossip",
    team: "Null Pointer",
    track: "Climate & Energy",
    submitted: "12:48",
    state: "Scored" as const,
    score: 8.6,
  },
  {
    name: "QuietQare",
    team: "Paper Boats",
    track: "Health Access",
    submitted: "12:51",
    state: "In review" as const,
    score: null,
  },
  {
    name: "LectureLens",
    team: "Salt & Static",
    track: "AI & Learning",
    submitted: "12:59",
    state: "Scored" as const,
    score: 9.1,
  },
];

export const RUBRIC = [
  { label: "Originality", weight: "25%", value: 8.5 },
  { label: "Technical depth", weight: "30%", value: 9.0 },
  { label: "Real-world impact", weight: "30%", value: 8.0 },
  { label: "Presentation", weight: "15%", value: 8.5 },
];

export const SCORE_HISTORY = [
  { round: "R1", value: 7.2 },
  { round: "R2", value: 8.1 },
  { round: "R3", value: 8.6 },
  { round: "Final", value: 8.6 },
];

export const RESULTS = [
  { rank: 1, team: "Salt & Static", project: "LectureLens", score: 9.1, medal: "gold" as const },
  { rank: 2, team: "Null Pointer", project: "GridGossip", score: 8.6, medal: "silver" as const },
  { rank: 3, team: "Paper Boats", project: "QuietQare", score: 8.4, medal: "bronze" as const },
];

export const SUMMARY = [
  { label: "Participants checked in", value: "1,142" },
  { label: "Teams submitted", value: "148 / 167" },
  { label: "Median check-in time", value: "11 sec" },
  { label: "Judging rounds", value: "3" },
];
