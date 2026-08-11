/**
 * Measures where the time actually goes on a request: TCP reach, Prisma
 * connect, and a few representative queries.
 *
 * Run: node prisma/db-latency.mjs
 */
import net from "node:net";
import { PrismaClient } from "@prisma/client";

const host = "srv1834.hstgr.io";
const port = 3306;

function tcpConnect() {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.createConnection(port, host, () => {
      const ms = Date.now() - started;
      socket.end();
      resolve(ms);
    });
    socket.setTimeout(10000);
    socket.once("timeout", () => {
      socket.destroy();
      resolve(-1);
    });
    socket.once("error", () => resolve(-1));
  });
}

const time = async (label, fn) => {
  const started = Date.now();
  try {
    await fn();
    console.log(`${label.padEnd(38)} ${String(Date.now() - started).padStart(6)} ms`);
  } catch (e) {
    console.log(`${label.padEnd(38)} FAILED  ${e.message.split("\n")[0]}`);
  }
};

const prisma = new PrismaClient();

console.log("── TCP reachability (3 samples) ──");
for (let i = 0; i < 3; i++) {
  const ms = await tcpConnect();
  console.log(`  handshake ${i + 1}`.padEnd(40) + (ms < 0 ? "UNREACHABLE" : `${String(ms).padStart(5)} ms`));
}

console.log("\n── Prisma ──");
await time("connect + first query (cold)", () => prisma.$queryRaw`SELECT 1`);
await time("SELECT 1 (warm)", () => prisma.$queryRaw`SELECT 1`);
await time("SELECT 1 (warm)", () => prisma.$queryRaw`SELECT 1`);

console.log("\n── Queries the careers endpoint runs ──");
await time("career.count()", () => prisma.career.count({ where: { status: "published" } }));
await time("career.findMany(6) FULL row", () =>
  prisma.career.findMany({ where: { status: "published" }, take: 6 })
);
await time("career.findMany(6) list fields only", () =>
  prisma.career.findMany({
    where: { status: "published" },
    take: 6,
    select: {
      slug: true,
      title: true,
      category: true,
      location: true,
      type: true,
      duration: true,
      salary: true,
      unit: true,
      featured: true,
      publishedAt: true,
      createdAt: true,
    },
  })
);
await time("discipline.findMany()", () => prisma.discipline.findMany({ where: { active: true } }));

console.log("\n── Sequential vs parallel (the endpoint does count THEN findMany) ──");
const seq = Date.now();
await prisma.career.count({ where: { status: "published" } });
await prisma.career.findMany({ where: { status: "published" }, take: 6 });
await prisma.discipline.findMany({ where: { active: true } });
console.log(`  sequential (current shape)`.padEnd(40) + `${String(Date.now() - seq).padStart(5)} ms`);

const par = Date.now();
await Promise.all([
  prisma.career.count({ where: { status: "published" } }),
  prisma.career.findMany({ where: { status: "published" }, take: 6 }),
  prisma.discipline.findMany({ where: { active: true } }),
]);
console.log(`  parallel`.padEnd(40) + `${String(Date.now() - par).padStart(5)} ms`);

await prisma.$disconnect();
