import { Shell, Body } from "@/components/Shell";
import { TopBar } from "@/components/ui";
import { CrisisCard } from "@/app/me/MindForms";

export const metadata = { title: "Get help now · Connect" };

export default function HelpPage() {
  return (
    <Shell>
      <TopBar title="Get help now" back="/me" />
      <Body>
        <CrisisCard strong />
        <section className="card text-sm">
          <b>If you or someone else is in danger right now, call 112.</b>
          <span className="text-muted">Connect is not an emergency service, and your therapist may not see messages straight away. Tele-MANAS is run by the Government of India. Counsellors speak many Indian languages.</span>
        </section>
      </Body>
    </Shell>
  );
}
