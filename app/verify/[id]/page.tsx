import { notFound } from "next/navigation";
import { VerificationRunner } from "@/components/verification-runner";
import { getVerification, toPublicVerification } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VerificationProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getVerification(id);
  if (!record) notFound();
  return <VerificationRunner initial={toPublicVerification(record)} />;
}
