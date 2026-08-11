/**
 * Seed a realistic set of open roles for testing the careers module.
 *
 *   node --env-file=.env prisma/seed-careers.mjs
 *
 * Idempotent — upserts by slug, so re-running refreshes rather than duplicates.
 * Pass --clean to delete every seeded role first (matched on the SEED_SLUGS
 * list, so hand-created roles are never touched).
 *
 * Descriptions are written in the exact HTML the TipTap editor produces,
 * including its `<li><p>…</p></li>` list wrapping, so the frontend's `.jd-body`
 * styles are exercised the same way real authored content would exercise them.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Shared package copy — identical across every role, as on the live site. */
const OFFER = [
  "Compliant global payroll in your currency, paid on time, every rotation.",
  "Visas, medicals, travel and accommodation arranged before you fly.",
  "Transparent, benchmarked day rates with no hidden agency margins.",
  "One dedicated account desk that knows your file end to end.",
];

/** Discipline-level responsibilities and requirements. */
const BY_DISCIPLINE = {
  "Marine & Offshore": {
    responsibilities: [
      "Maintain safe station-keeping and watchkeeping in line with the vessel's DP and marine operating procedures.",
      "Operate and monitor bridge, DP and navigation systems across each shift.",
      "Work to permit-to-work and safety-critical procedures alongside the OIM and marine team.",
      "Keep accurate logs, handovers and incident reports for every watch.",
    ],
    requirements: [
      "Valid STCW certification and a current offshore medical (OGUK / ENG1 or equivalent).",
      "BOSIET / FOET survival training valid for the region.",
      "Role-relevant DP or marine certification with verifiable sea time.",
      "Fluent English and strong situational awareness under pressure.",
    ],
  },
  Engineering: {
    responsibilities: [
      "Own engineering delivery for your discipline across design, commissioning and hand-over.",
      "Produce and review technical documentation against project specifications and codes.",
      "Coordinate with multidiscipline teams, vendors and the client's site representatives.",
      "Drive close-out of punch-list items and support a safe start-up.",
    ],
    requirements: [
      "Degree or equivalent in a relevant engineering discipline.",
      "Proven project experience in energy, oil & gas or infrastructure.",
      "Working knowledge of international standards (ISO, API, IEC) relevant to the role.",
      "Strong reporting and stakeholder-communication skills.",
    ],
  },
  Renewables: {
    responsibilities: [
      "Install, commission and maintain turbine or solar plant to manufacturer and project standards.",
      "Carry out inspections, fault-finding and preventive maintenance safely at height or on site.",
      "Complete service records, snags and commissioning sign-offs accurately.",
      "Uphold electrical safety and isolation procedures at all times.",
    ],
    requirements: [
      "Current GWO modules (or willingness to certify) and work-at-height training.",
      "Relevant electrical or mechanical qualification for the role.",
      "Experience on wind, solar or BESS projects preferred.",
      "Comfortable with remote sites and rotational travel.",
    ],
  },
  "HSE & Quality": {
    responsibilities: [
      "Implement and monitor the project HSE and quality management systems on site.",
      "Run audits, inspections, toolbox talks and incident investigations.",
      "Track corrective actions to close-out and report performance to the client.",
      "Champion a strong safety culture across all crews and subcontractors.",
    ],
    requirements: [
      "Recognised HSE or QA certification (NEBOSH / IOSH, or CSWIP / CQI as relevant).",
      "Audit and inspection experience against international standards.",
      "Confident engaging crews, supervisors and client representatives.",
      "Meticulous documentation and reporting discipline.",
    ],
  },
  "Oil & Gas": {
    responsibilities: [
      "Supervise safe drilling / well operations and the crews delivering them.",
      "Maintain well control, equipment integrity and operational readiness.",
      "Enforce permit-to-work, isolation and safety-critical procedures.",
      "Report progress, NPT and HSE performance to the company man and base.",
    ],
    requirements: [
      "Valid well-control certification (IWCF / IADC) where applicable.",
      "Offshore survival (BOSIET / FOET) and a current medical.",
      "Solid discipline experience on comparable operations.",
      "Strong leadership and clear communication with mixed-nationality crews.",
    ],
  },
};

const li = (items) =>
  `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join("")}</ul>`;

function buildDescription(role) {
  const d = BY_DISCIPLINE[role.category] ?? BY_DISCIPLINE.Engineering;
  const overview =
    `We're hiring a ${role.title} for a ${role.type.toLowerCase()} assignment in ` +
    `${role.location}. It's a ${role.duration} position paying ${role.salary}${role.unit}, ` +
    `mobilized and managed end to end by Rebellabz — you focus on the job while we ` +
    `handle visas, travel, payroll and compliance.`;

  return [
    `<h2>About the role</h2><p>${overview}</p>`,
    `<h2>Key responsibilities</h2>${li(d.responsibilities)}`,
    `<h2>What you'll need</h2>${li(d.requirements)}`,
    `<h2>What we offer</h2>${li(OFFER)}`,
  ].join("");
}

/**
 * `days` = how long ago the role was published; it drives the "posted" label
 * and the newest/oldest sort, so the spread is deliberate.
 */
const ROLES = [
  // ── Marine & Offshore ────────────────────────────────────────────────
  { category: "Marine & Offshore", title: "Senior DP Operator", location: "North Sea, UK", type: "Rotational", duration: "6/6 rotation", salary: "£700–820", unit: "/day", featured: true, days: 1 },
  { category: "Marine & Offshore", title: "Chief Officer (DP)", location: "Gulf of Mexico, US", type: "Rotational", duration: "5/5 rotation", salary: "$650–780", unit: "/day", days: 6 },
  { category: "Marine & Offshore", title: "ROV Supervisor", location: "Aberdeen, UK", type: "Rotational", duration: "4/4 rotation", salary: "£560–680", unit: "/day", days: 13 },
  { category: "Marine & Offshore", title: "Marine Superintendent", location: "Singapore", type: "Staff", duration: "Residential", salary: "$140–165k", unit: "/yr", days: 21 },
  { category: "Marine & Offshore", title: "Barge Master", location: "Persian Gulf, UAE", type: "Rotational", duration: "28/28 rotation", salary: "$780–900", unit: "/day", days: 27 },

  // ── Engineering ──────────────────────────────────────────────────────
  { category: "Engineering", title: "Commissioning Lead — LNG", location: "Ras Laffan, Qatar", type: "Contract", duration: "24-month", salary: "$850–1,000", unit: "/day", featured: true, days: 2 },
  { category: "Engineering", title: "Subsea Pipeline Engineer", location: "Stavanger, Norway", type: "Rotational", duration: "4/4 rotation", salary: "€720–840", unit: "/day", days: 4 },
  { category: "Engineering", title: "Instrumentation Technician", location: "Kuala Lumpur, Malaysia", type: "Staff", duration: "Residential", salary: "$90–110k", unit: "/yr", days: 12 },
  { category: "Engineering", title: "Rotating Equipment Engineer", location: "Rotterdam, Netherlands", type: "Contract", duration: "18-month", salary: "€640–760", unit: "/day", days: 16 },
  { category: "Engineering", title: "Electrical Design Engineer — HV", location: "Perth, Australia", type: "Contract", duration: "12-month", salary: "A$820–950", unit: "/day", days: 24 },
  { category: "Engineering", title: "Piping Stress Engineer", location: "Mumbai, India", type: "Staff", duration: "Residential", salary: "$55–70k", unit: "/yr", days: 33 },
  { category: "Engineering", title: "Process Safety Engineer", location: "Calgary, Canada", type: "Staff", duration: "Residential", salary: "C$130–155k", unit: "/yr", days: 41 },

  // ── Renewables ───────────────────────────────────────────────────────
  { category: "Renewables", title: "Wind Turbine Technician (GWO)", location: "Rio Grande, Brazil", type: "Rotational", duration: "12-month", salary: "€480–560", unit: "/day", featured: true, days: 2 },
  { category: "Renewables", title: "Solar Project Engineer", location: "Abu Dhabi, UAE", type: "Contract", duration: "18-month", salary: "$520–620", unit: "/day", days: 7 },
  { category: "Renewables", title: "BESS Commissioning Engineer", location: "Perth, Australia", type: "Contract", duration: "12-month", salary: "A$780–900", unit: "/day", days: 15 },
  { category: "Renewables", title: "Offshore Wind HV Cable Engineer", location: "Esbjerg, Denmark", type: "Rotational", duration: "3/3 rotation", salary: "€700–820", unit: "/day", days: 19 },
  { category: "Renewables", title: "Blade Repair Technician", location: "Taichung, Taiwan", type: "Rotational", duration: "6-month", salary: "$430–510", unit: "/day", days: 29 },
  { category: "Renewables", title: "Green Hydrogen Process Lead", location: "Neom, Saudi Arabia", type: "Staff", duration: "Residential", salary: "$170–200k", unit: "/yr", days: 38 },

  // ── HSE & Quality ────────────────────────────────────────────────────
  { category: "HSE & Quality", title: "HSE Manager — EPC", location: "Jubail, Saudi Arabia", type: "Staff", duration: "Residential", salary: "$160–190k", unit: "/yr", featured: true, days: 3 },
  { category: "HSE & Quality", title: "QA/QC Inspector — Welding", location: "Rotterdam, Netherlands", type: "Contract", duration: "9-month", salary: "€400–470", unit: "/day", days: 8 },
  { category: "HSE & Quality", title: "Safety Officer — Offshore", location: "Lagos, Nigeria", type: "Rotational", duration: "6/6 rotation", salary: "$380–450", unit: "/day", days: 18 },
  { category: "HSE & Quality", title: "NDT Level II Technician", location: "Sohar, Oman", type: "Contract", duration: "10-month", salary: "$420–500", unit: "/day", days: 26 },
  { category: "HSE & Quality", title: "Lead Auditor — ISO 45001", location: "Houston, US", type: "Staff", duration: "Residential", salary: "$115–140k", unit: "/yr", days: 44 },

  // ── Oil & Gas ────────────────────────────────────────────────────────
  { category: "Oil & Gas", title: "Drilling Supervisor", location: "Luanda, Angola", type: "Rotational", duration: "28/28 rotation", salary: "$900–1,050", unit: "/day", days: 5 },
  { category: "Oil & Gas", title: "Mud Engineer", location: "Basra, Iraq", type: "Rotational", duration: "35/35 rotation", salary: "$700–820", unit: "/day", days: 10 },
  { category: "Oil & Gas", title: "Completion Engineer", location: "Port Harcourt, Nigeria", type: "Rotational", duration: "4/4 rotation", salary: "$820–960", unit: "/day", days: 22 },
  { category: "Oil & Gas", title: "Production Operator", location: "Karachaganak, Kazakhstan", type: "Rotational", duration: "28/28 rotation", salary: "$520–610", unit: "/day", days: 31 },

  // ── Drafts (exercise the status filter and the public 404 path) ──────
  { category: "Oil & Gas", title: "Wireline Field Specialist", location: "Doha, Qatar", type: "Rotational", duration: "6/6 rotation", salary: "$600–720", unit: "/day", status: "draft" },
  { category: "Engineering", title: "Structural Engineer — Jackets", location: "Busan, South Korea", type: "Contract", duration: "14-month", salary: "$690–800", unit: "/day", status: "draft" },
];

const SEED_SLUGS = ROLES.map((r) => slugify(r.title));

async function main() {
  const clean = process.argv.includes("--clean");

  const author = await prisma.user.findFirst({ select: { id: true } });
  if (!author) throw new Error("No user found — create an admin before seeding.");

  // Every role's discipline must already exist, or the CMS form and the public
  // tabs would disagree with the data.
  const known = new Set((await prisma.discipline.findMany({ select: { name: true } })).map((d) => d.name));
  const missing = [...new Set(ROLES.map((r) => r.category))].filter((c) => !known.has(c));
  if (missing.length) {
    throw new Error(`Missing disciplines: ${missing.join(", ")}. Add them under Careers → Disciplines first.`);
  }

  if (clean) {
    const { count } = await prisma.career.deleteMany({ where: { slug: { in: SEED_SLUGS } } });
    console.log(`Removed ${count} previously seeded role(s).`);
  }

  let created = 0;
  let updated = 0;

  for (const role of ROLES) {
    const slug = slugify(role.title);
    const status = role.status ?? "published";
    const publishedAt =
      status === "published" ? new Date(Date.now() - (role.days ?? 0) * 86_400_000) : null;

    const data = {
      title: role.title,
      category: role.category,
      location: role.location,
      type: role.type,
      duration: role.duration,
      // Stored WITHOUT the unit — the unit column supplies it.
      salary: role.salary,
      unit: role.unit,
      featured: Boolean(role.featured),
      summary: `${role.type} ${role.title} in ${role.location} — ${role.duration}, ${role.salary}${role.unit}.`,
      description: buildDescription(role),
      metaTitle: `${role.title} — Careers`,
      metaDescription: `Apply for ${role.title} (${role.type}, ${role.location}). ${role.salary}${role.unit}. Mobilized and managed end to end by Rebellabz.`,
      status,
      publishedAt,
      authorId: author.id,
    };

    const existing = await prisma.career.findUnique({ where: { slug }, select: { id: true } });
    if (existing) {
      await prisma.career.update({ where: { slug }, data });
      updated++;
    } else {
      await prisma.career.create({ data: { ...data, slug } });
      created++;
    }
  }

  const [total, published, drafts, featured] = await Promise.all([
    prisma.career.count(),
    prisma.career.count({ where: { status: "published" } }),
    prisma.career.count({ where: { status: "draft" } }),
    prisma.career.count({ where: { featured: true } }),
  ]);

  console.log(`\nCreated ${created}, updated ${updated}.`);
  console.log(`Total ${total} — ${published} published, ${drafts} draft, ${featured} featured.\n`);

  const byCategory = await prisma.career.groupBy({
    by: ["category"],
    _count: { _all: true },
    orderBy: { category: "asc" },
  });
  for (const c of byCategory) console.log(`  ${c.category.padEnd(20)} ${c._count._all}`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
