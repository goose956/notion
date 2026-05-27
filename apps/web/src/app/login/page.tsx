import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

function resolveSafeCallbackUrl(callbackUrl: string | undefined): string {
  if (!callbackUrl) return "/members/get-started";
  if (callbackUrl === "undefined" || callbackUrl.endsWith("/undefined")) return "/members/get-started";
  // Only allow same-origin relative paths to avoid open redirects.
  if (!callbackUrl.startsWith("/")) return "/members/get-started";
  return callbackUrl;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const callbackUrl = resolveSafeCallbackUrl(searchParams.callbackUrl);
  const isActivateFlow = callbackUrl.startsWith("/activate/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/s-logo.png" alt="Stridivo" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isActivateFlow ? "Create your account" : "Welcome to Stridivo"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isActivateFlow
              ? "Enter your email to activate your purchase"
              : "Sign in to continue"}
          </p>
        </div>

        {/* Email sign-in form — shown first for activation flow, always available */}
        <form
          action={async (formData: FormData) => {
            "use server";
            const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
            if (!email || !email.includes("@")) return;
            await signIn("email", { email, redirectTo: callbackUrl });
          }}
          className="space-y-3"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button type="submit" className="w-full">
            Continue with email
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        {/* Notion OAuth — for users who want to sync to Notion */}
        <form
          action={async () => {
            "use server";
            await signIn("notion", { redirectTo: callbackUrl });
          }}
        >
          <Button type="submit" variant="outline" className="w-full gap-2">
            <NotionIcon />
            Continue with Notion
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {isActivateFlow
            ? "Your credits and workspace will be set up automatically after sign-in."
            : "Sign in with Notion to sync your databases, or use email for the in-app workspace."}
        </p>
      </div>
    </div>
  );
}

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.281-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}
