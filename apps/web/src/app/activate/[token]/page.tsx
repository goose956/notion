import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActivationLink } from "@niche-factory/db";
import ActivateClient from "./ActivateClient";
import Link from "next/link";

interface Props {
  params: { token: string };
}

export default async function ActivatePage({ params }: Props) {
  const { token } = params;

  // Look up the link to give a better UX (show what they're getting before login)
  const link = await getActivationLink(token).catch(() => undefined);

  if (link?.usedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold">Link already used</h1>
          <p className="text-sm text-muted-foreground">
            This activation link has already been redeemed. If you think this is a mistake, please contact support.
          </p>
          <Link
            href="/login"
            className="inline-block mt-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <h1 className="text-xl font-semibold">Invalid link</h1>
          <p className="text-sm text-muted-foreground">
            This activation link is not valid. Please check the URL and try again.
          </p>
        </div>
      </div>
    );
  }

  // Gate: user must be logged in to activate
  const session = await auth();
  if (!session?.user) {
    const callbackUrl = encodeURIComponent(`/activate/${token}`);
    redirect(`/signup?callbackUrl=${callbackUrl}`);
  }

  const niceNicheName = link.nichePackId
    .split("-")
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="text-center max-w-sm px-6 mb-2">
        <p className="text-sm text-muted-foreground">
          Activating <strong>{niceNicheName}</strong> · {link.credits} credits
        </p>
      </div>
      <ActivateClient token={token} />
    </div>
  );
}
