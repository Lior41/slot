import { redirect } from "next/navigation";
import { currentActor } from "@/server/auth";
import { studioData } from "@/server/queries";
import { StudioShell } from "@/components/studio-shell";
export default async function Page() {
  const a = await currentActor();
  if (!a) redirect("/demo");
  return <StudioShell initial={await studioData(a)} view="sessions" />;
}
