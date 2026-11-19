import { requireNutritionist } from "@/lib/auth";
import { TopBar } from "@/components/ui";
import { Body } from "@/components/Shell";
import { AddClientForm } from "./AddClientForm";

export const metadata = { title: "Add a client · Connect" };

export default async function NewClient() {
  const { me } = await requireNutritionist();
  return (
    <>
      <TopBar title="Add a client" back="/pro/clients" />
      <Body><div className="w-full max-w-xl"><AddClientForm practice={me.practice_name} /></div></Body>
    </>
  );
}
