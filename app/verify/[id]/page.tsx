import { notFound } from "next/navigation";
import { VerificationRunner } from "@/components/verification-runner";
import { getVerification, toPublicVerification } from "@/lib/db";
import { getSessionHash } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VerificationProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ownerHash = await getSessionHash();
  const record = ownerHash ? await getVerification(id, ownerHash) : null;
  if (!record) notFound();
  return <VerificationRunner initial={toPublicVerification(record)} />;
}
