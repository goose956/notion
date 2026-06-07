import { notFound } from "next/navigation";
import { getTemplateBySlug } from "@niche-factory/db";
import type { Metadata } from "next";
import {
  Zap, CheckCircle2, ArrowRight, Brain, Sparkles,
  Clock, Target, TrendingUp, Star, Shield, Rocket,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

interface LandingData {
  headline: string;
  subheadline: string;
  hook: string;
  bullets: string[];
  result: string;
  cta: string;
}

function parseLandingData(body: string): LandingData | null {
  try {
    const d = JSON.parse(body) as Partial<LandingData>;
    if (!d.headline) return null;
    return {
      headline: d.headline ?? "",
      subheadline: d.subheadline ?? "",
      hook: d.hook ?? "",
      bullets: Array.isArray(d.bullets) ? d.bullets : [],
      result: d.result ?? "",
      cta: d.cta ?? "Get it free",
    };
  } catch {
    return null;
  }
}

const BULLET_ICONS = [Zap, CheckCircle2, Target, Brain, Clock, TrendingUp, Star, Shield, Rocket, Sparkles];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTemplateBySlug(slug).catch(() => undefined);
  if (!t) return { title: "Not Found" };
  const d = parseLandingData(t.body);
  return {
    title: d?.headline ? `${d.headline} | Stridivo` : `${t.title} | Stridivo`,
    description: d?.hook || t.problemStatement || t.tagline,
  };
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTemplateBySlug(slug).catch(() => undefined);

  if (!t || !t.published) notFound();

  const d = parseLandingData(t.body);
  if (!d) notFound();

  const signupHref = t.nichePackId
    ? `/members/setup/${t.nichePackId}`
    : "/signup";

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white overflow-x-hidden">

      {/* ── Ambient glow ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 60% -10%, rgba(232,61,0,0.18) 0%, transparent 70%), " +
            "radial-gradient(ellipse 50% 40% at 10% 80%, rgba(232,61,0,0.08) 0%, transparent 60%)",
        }}
      />

      {/* ── Nav bar ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <a href="/" className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/s-logo.png" alt="Stridivo" className="h-6 w-auto opacity-90" />
          <span>stridivo.com</span>
        </a>
        <a
          href={signupHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 transition-colors"
        >
          Sign in
        </a>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 pt-12 pb-20 px-6 text-center max-w-4xl mx-auto">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E83D00]/40 bg-[#E83D00]/10 px-4 py-1.5 text-xs font-medium text-[#ff7040] mb-8 tracking-wide uppercase">
          <Sparkles className="h-3 w-3" />
          Free AI Workspace · {t.title.replace(/ Landing Page$/i, "").trim()}
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white mb-5">
          {d.headline}
        </h1>

        {/* Subheadline */}
        {d.subheadline && (
          <p className="text-lg sm:text-xl font-medium text-[#ff7040] mb-6 max-w-2xl mx-auto">
            {d.subheadline}
          </p>
        )}

        {/* Hook */}
        <p className="text-base sm:text-lg text-white/60 leading-relaxed max-w-2xl mx-auto mb-10">
          {d.hook}
        </p>

        {/* Primary CTA */}
        <a
          href={signupHref}
          className="inline-flex items-center gap-2 bg-[#E83D00] hover:bg-[#d13600] text-white font-bold text-base px-8 py-4 rounded-full shadow-lg shadow-[#E83D00]/30 transition-all hover:shadow-[#E83D00]/50 hover:scale-[1.02]"
        >
          {d.cta}
          <ArrowRight className="h-4 w-4" />
        </a>

        <p className="mt-4 text-xs text-white/30">No credit card. No setup. Just plug in and go.</p>
      </section>

      {/* ── Divider gradient line ── */}
      <div
        aria-hidden
        className="relative z-10 h-px max-w-3xl mx-auto"
        style={{ background: "linear-gradient(90deg, transparent, rgba(232,61,0,0.5), transparent)" }}
      />

      {/* ── Bullets ── */}
      {d.bullets.length > 0 && (
        <section className="relative z-10 py-16 px-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {d.bullets.map((bullet, i) => {
              const Icon = BULLET_ICONS[i % BULLET_ICONS.length]!;
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 hover:bg-white/[0.06] transition-colors"
                >
                  <span className="shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#E83D00]/15 text-[#ff7040]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm text-white/80 leading-relaxed">{bullet}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Result block ── */}
      {d.result && (
        <section className="relative z-10 py-16 px-6">
          <div
            className="max-w-3xl mx-auto rounded-3xl p-10 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(232,61,0,0.12) 0%, rgba(232,61,0,0.04) 100%)",
              border: "1px solid rgba(232,61,0,0.25)",
            }}
          >
            <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed">
              {d.result}
            </p>
          </div>
        </section>
      )}

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-20 px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Ready to hand the busywork to AI?
        </h2>
        <p className="text-white/50 mb-8 text-sm">Takes 60 seconds to set up.</p>
        <a
          href={signupHref}
          className="inline-flex items-center gap-2 bg-[#E83D00] hover:bg-[#d13600] text-white font-bold text-base px-8 py-4 rounded-full shadow-lg shadow-[#E83D00]/30 transition-all hover:shadow-[#E83D00]/50 hover:scale-[1.02]"
        >
          {d.cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/8 py-6 px-6 text-center">
        <p className="text-xs text-white/30">
          © {new Date().getFullYear()}{" "}
          <a href="/" className="hover:text-white/60 transition-colors">stridivo.com</a>
          {" "}· AI-powered Notion workspaces
        </p>
      </footer>
    </div>
  );
}
