import { requireUser } from "@/lib/auth";
import { MeNav } from "@/components/me-nav";
import { IdentityForm } from "@/components/identity-form";
import { EmailChangeForm, ProfileSettings } from "@/components/profile-settings";

export default async function SettingsPage() {
  const user = await requireUser({ verified: false });
  return <main className="container-page max-w-4xl py-10"><MeNav /><h1 className="mb-5 text-3xl font-bold">账号设置</h1><div className="space-y-5"><ProfileSettings username={user.username} bio={user.bio} avatarUrl={user.avatarUrl} /><IdentityForm current={user.identityBadge} /><EmailChangeForm currentEmail={user.email} /></div></main>;
}
