import Link from "next/link";
import { requireNutritionist } from "@/lib/auth";
import { TopBar } from "@/components/ui";
import { Body, Cols } from "@/components/Shell";
import { LogoutButton } from "@/components/LogoutButton";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings · Connect" };

export default async function More({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, profile, me } = await requireNutritionist();
  const welcome = (await searchParams).welcome;
  return (
    <>
      <TopBar title="Settings" />
      <Body>
        {welcome && <p className="rounded-xl bg-good-soft p-3 text-sm"><b>Your practice is ready.</b> Add your Google Meet link below, then add your first client.</p>}
        <Cols>
          <SettingsForm initial={{
            name: profile.full_name ?? "", phone: profile.phone ?? "", practice_name: me.practice_name ?? "", city: me.city ?? "",
            qualification: me.qualification ?? "", meet_url: me.meet_url ?? "", session_minutes: me.session_minutes,
            chat_start: me.chat_start?.slice(0, 5) ?? "", chat_end: me.chat_end?.slice(0, 5) ?? "",
          }} />
          <div className="flex flex-col gap-3">
            <section className="card">
              <h2 className="h3">Tools</h2>
              <Link href="/pro/plans" className="flex items-center justify-between py-1"><span><b>Diet plan templates</b><br /><span className="text-sm text-muted">Build plans once, send to any client</span></span><span aria-hidden>›</span></Link>
              <Link href="/pro/clients?show=ended" className="flex items-center justify-between border-t border-line pt-2.5"><span><b>Past clients</b><br /><span className="text-sm text-muted">Ended programs, history kept</span></span><span aria-hidden>›</span></Link>
            </section>
            <section className="card">
              <h2 className="h3">Install the app</h2>
              <p className="text-sm text-muted">On your phone, open this site in Chrome and tap <b>Add to Home screen</b> (iPhone: Share, then Add to Home Screen). It opens like an app.</p>
            </section>
            <section className="card">
              <h2 className="h3">Account</h2>
              <p className="text-sm text-muted">Signed in as {user.email}</p>
              <LogoutButton />
            </section>
          </div>
        </Cols>
      </Body>
    </>
  );
}
