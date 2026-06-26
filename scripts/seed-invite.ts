/**
 * 生成邀请码脚本
 *
 * 用法:
 *   npx tsx scripts/seed-invite.ts <code1> [code2] [code3] ...
 *
 * 或指定最大使用次数:
 *   npx tsx scripts/seed-invite.ts --max 5 CODE1 CODE2
 *
 * 示例:
 *   npx tsx scripts/seed-invite.ts EARTH2024 WANDER2024
 *   npx tsx scripts/seed-invite.ts --max 10 VIP-CODE
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  let maxUses = 1;
  const codes: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--max" && i + 1 < args.length) {
      maxUses = parseInt(args[i + 1], 10);
      if (isNaN(maxUses) || maxUses < 1) {
        console.error("❌ --max 必须是一个正整数");
        process.exit(1);
      }
      i++; // skip next arg
    } else {
      codes.push(args[i]);
    }
  }

  if (codes.length === 0) {
    console.log("用法: npx tsx scripts/seed-invite.ts [--max N] <code1> [code2] ...");
    console.log("示例: npx tsx scripts/seed-invite.ts --max 5 EARTH2024");
    process.exit(1);
  }

  console.log(`生成 ${codes.length} 个邀请码，每个可使用 ${maxUses} 次:\n`);

  for (const code of codes) {
    // upsert: 如果已存在则更新 maxUses，否则创建
    const record = await prisma.inviteCode.upsert({
      where: { code },
      update: { maxUses },
      create: { code, maxUses },
    });
    console.log(`  ✅ ${record.code}  (${record.usedCount}/${record.maxUses} 已用)`);
  }

  console.log("\n完成！");
}

main()
  .catch((e) => {
    console.error("❌ 错误:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
