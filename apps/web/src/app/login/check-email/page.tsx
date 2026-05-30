import { Mail } from "lucide-react";
import Link from "next/link";

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email ?? "your inbox";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-6 text-center">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/s-logo.png" alt="Stridivo" className="h-16 w-auto" />
        </div>

        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We&apos;ve sent a sign-in link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Click the link in the email to sign in.
          </p>
        </div>

        <div className="rounded-md border bg-muted/40 px-4 py-3 text-left space-y-1">
          <p className="text-xs font-medium text-foreground">Didn&apos;t get the email?</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
            <li>Check your spam or junk folder</li>
            <li>The link expires after 30 minutes</li>
            <li>Make sure you used the right email address</li>
          </ul>
        </div>

        <Link
          href="/login"
          className="inline-block text-sm text-primary hover:underline"
        >
          Try a different email
        </Link>
      </div>
    </div>
  );
}
