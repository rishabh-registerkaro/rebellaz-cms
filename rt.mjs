import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const row = await p.aboutPage.findFirst();
const c = row.content;
c.story.heading = "ROUND TRIP TEST HEADING";
await p.aboutPage.update({ where: { id: row.id }, data: { content: c } });
console.log("  story.heading changed in the CMS");
await p.$disconnect();
