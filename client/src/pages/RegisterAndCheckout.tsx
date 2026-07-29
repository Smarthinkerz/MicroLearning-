import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

// Country codes for phone
const COUNTRY_CODES = [
  { code: "1", label: "🇺🇸 +1 (US/CA)" },
  { code: "44", label: "🇬🇧 +44 (UK)" },
  { code: "966", label: "🇸🇦 +966 (SA)" },
  { code: "971", label: "🇦🇪 +971 (UAE)" },
  { code: "965", label: "🇰🇼 +965 (KW)" },
  { code: "974", label: "🇶🇦 +974 (QA)" },
  { code: "973", label: "🇧🇭 +973 (BH)" },
  { code: "968", label: "🇴🇲 +968 (OM)" },
  { code: "20", label: "🇪🇬 +20 (EG)" },
  { code: "962", label: "🇯🇴 +962 (JO)" },
  { code: "91", label: "🇮🇳 +91 (IN)" },
  { code: "92", label: "🇵🇰 +92 (PK)" },
  { code: "63", label: "🇵🇭 +63 (PH)" },
  { code: "61", label: "🇦🇺 +61 (AU)" },
  { code: "49", label: "🇩🇪 +49 (DE)" },
  { code: "33", label: "🇫🇷 +33 (FR)" },
];

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
  consumer_free: "Free",
  consumer_premium: "Premium",
};

export default function RegisterAndCheckout() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const planSlug = params.get("plan") || "pro";
  const cycle = (params.get("cycle") as "monthly" | "yearly") || "monthly";

  const [step, setStep] = useState<"register" | "processing">("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("1");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: plans } = trpc.subscription.getPlans.useQuery();
  const plan = plans?.find(p => p.slug === planSlug);

  const checkoutMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    },
    onError: (err) => {
      setLoading(false);
      setStep("register");
      toast.error(`Checkout failed: ${err.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim()) { toast.error("First name is required"); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Valid email is required"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 6) { toast.error("Valid phone number is required (min 6 digits)"); return; }

    setLoading(true);
    setStep("processing");

    try {
      // Step 1: Create Supabase account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: `+${countryCode}${phone.replace(/\D/g, "")}`,
          },
        },
      });

      if (signUpError) {
        // If user already exists, try signing in instead
        if (signUpError.message.toLowerCase().includes("already registered") || signUpError.message.toLowerCase().includes("already exists")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (signInError) {
            toast.error("Account already exists. Please sign in first or use a different email.");
            setLoading(false);
            setStep("register");
            return;
          }
        } else {
          throw signUpError;
        }
      }

      if (!authData?.session && !authData?.user) {
        // Email confirmation required — tell user and redirect to login
        toast.info("Check your email to confirm your account, then sign in to complete your purchase.");
        navigate(`/login?plan=${planSlug}&cycle=${cycle}&redirect=/pricing`);
        return;
      }

      // Step 2: Fire Tap checkout immediately
      checkoutMutation.mutate({
        planSlug,
        cycle,
        quantity: 1,
        origin: window.location.origin,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      toast.error(message);
      setLoading(false);
      setStep("register");
    }
  };

  const planPrice = plan
    ? cycle === "yearly" && plan.priceYearly
      ? `$${Math.round(plan.priceYearly / 12)}/mo (billed $${plan.priceYearly}/yr)`
      : `$${plan.priceMonthly}/mo`
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-foreground">
          LearnShift
        </Link>
        <span className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={`/login?redirect=/pricing`} className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </span>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Plan summary banner */}
          {plan && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">You're signing up for</p>
                <p className="font-semibold text-foreground">
                  {PLAN_LABELS[plan.tier] || plan.name} Plan
                  {planPrice && <span className="ml-2 text-primary">{planPrice}</span>}
                </p>
              </div>
            </div>
          )}

          {step === "processing" ? (
            <Card className="border-border/50">
              <CardContent className="pt-12 pb-12 flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-lg font-semibold">Creating your account…</p>
                <p className="text-sm text-muted-foreground text-center">
                  Redirecting you to secure payment. Please don't close this window.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Create your account
                </CardTitle>
                <CardDescription>
                  Fill in your details to create an account and proceed to payment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="Jane"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={loading}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select value={countryCode} onValueChange={setCountryCode} disabled={loading}>
                        <SelectTrigger className="w-[140px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map(c => (
                            <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="5551234567"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                        disabled={loading}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Required by Tap Payments for receipt delivery</p>
                  </div>

                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                    ) : (
                      <><CreditCard className="mr-2 h-4 w-4" /> Create Account & Pay</>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Secured by Tap Payments · 3D Secure · SSL encrypted
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
