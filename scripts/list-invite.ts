/**
 * 查看邀请码使用情况
 *
 * 用法:
 *   npx tsx scripts/list-invite.ts              # 查看所有邀请码
 *   npx tsx scripts/list-invite.ts --unused     # 仅查看尚未用完的邀请码
 *   npx tsx scripts/list-invite.ts --available  # 仅查看仍可使用的（已用 < 上限）
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const unusedOnly = args.includes("--unused") || args.includes("--available");

  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (codes.length === 0) {
    console.log("暂无邀请码，使用以下命令生成：");
    console.log("  npx tsx scripts/seed-invite.ts <code>\n");
    return;
  }

  const filtered = unusedOnly
    ? codes.filter((c) => c.usedCount < c.maxUses)
    : codes;

  const total = filtered.length;
  const available = filtered.filter((c) => c.usedCount < c.maxUses).length;
  const exhausted = filtered.filter((c) => c.usedCount >= c.maxUses).length;

  console.log(
    `\n${unusedOnly ? "📋 仍可使用的邀请码" : "📋 全部邀请码"} (${total} 个)\n`
  );

  // 表头
  console.log(
    `${"邀请码".padEnd(24)} ${"已用/上限".padStart(10)}  ${"剩余".padStart(6)}  ${"状态".padStart(6)}`
  );
  console.log("─".repeat(60));

  for (const c of filtered) {
    const remaining = c.maxUses - c.usedCount;
    const status = remaining > 0 ? "✅ 可用" : "❌ 已用完";
    console.log(
      `${c.code.padEnd(24)} ${`${c.usedCount}/${c.maxUses}`.padStart(10)}  ${String(remaining).padStart(6)}  ${status}`
    );
  }

  console.log("─".repeat(60));
  console.log(`可用: ${available}  |  已用完: ${exhausted}`);
  console.log();
}

main()
  .catch((e) => {
    console.error("❌ 错误:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
