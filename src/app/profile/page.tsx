import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileContent } from "@/components/ui/ProfileContent";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <main className="min-h-screen bg-space-deeper">
      {/* 星空背景渐变 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        <ProfileContent user={session.user} />
      </div>
    </main>
  );
}
