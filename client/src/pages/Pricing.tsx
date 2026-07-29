import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Link } from "wouter";
import { useState } from "react";
import {
  Check, X, Building2, Users, Zap, Crown, Sparkles,
  ArrowRight, Shield, BookOpen, BarChart3, Globe,
  Headphones, Star, ChevronLeft, Mic
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663029149863/hiMSRR6jLFgWQvJW7KXFLZ/smarthinkerz-logo-original_15b12a42.jpg";

type PlanFeatures = {
  maxLessons: number;
  offlineAccess: boolean;
  basicTracking: boolean;
  fullAnalytics: boolean;
  adaptiveRecommendations: boolean;
  contentAuthoring: boolean;
  cohortManagement: boolean;
  scormXapiExport: boolean;
  rbac: boolean;
  sso: boolean;
  hrisIntegration: boolean;
  whiteLabel: boolean;
  customOnboarding: boolean;
  sla: boolean;
  dedicatedManager: boolean;
  gamification: boolean;
  pushNotifications: boolean;
  emailSupport: boolean;
  prioritySupport: boolean;
  voiceNarration: boolean;
};

const featureLabels: { key: keyof PlanFeatures; label: string; category: string }[] = [
  { key: "maxLessons", label: "Lesson Library Access", category: "Content" },
  { key: "offlineAccess", label: "Offline Access", category: "Content" },
  { key: "basicTracking", label: "Basic Progress Tracking", category: "Analytics" },
  { key: "fullAnalytics", label: "Full Analytics Dashboard", category: "Analytics" },
  { key: "adaptiveRecommendations", label: "AI-Powered Recommendations", category: "AI" },
  { key: "contentAuthoring", label: "Content Authoring Studio", category: "Content" },
  { key: "cohortManagement", label: "Cohort Management", category: "Management" },
  { key: "scormXapiExport", label: "SCORM/xAPI Export", category: "Compliance" },
  { key: "rbac", label: "Role-Based Access Control", category: "Security" },
  { key: "sso", label: "Single Sign-On (SSO)", category: "Security" },
  { key: "hrisIntegration", label: "HRIS Integration", category: "Integration" },
  { key: "whiteLabel", label: "White-Label Branding", category: "Customization" },
  { key: "customOnboarding", label: "Custom Onboarding", category: "Support" },
  { key: "sla", label: "SLA Guarantee", category: "Support" },
  { key: "dedicatedManager", label: "Dedicated Account Manager", category: "Support" },
  { key: "gamification", label: "Gamification & Badges", category: "Engagement" },
  { key: "pushNotifications", label: "Push Notifications", category: "Engagement" },
  { key: "emailSupport", label: "Email Support", category: "Support" },
  { key: "prioritySupport", label: "Priority Support", category: "Support" },
  { key: "voiceNarration", label: "AI Voice Narration", category: "AI" },
];

const tierIcons: Record<string, React.ReactNode> = {
  starter: <Zap className="h-6 w-6 text-blue-400" />,
  pro: <Star className="h-6 w-6 text-purple-400" />,
  enterprise: <Crown className="h-6 w-6 text-amber-400" />,
  consumer_free: <BookOpen className="h-6 w-6 text-emerald-400" />,
  consumer_premium: <Sparkles className="h-6 w-6 text-rose-400" />,
};

const tierColors: Record<string, string> = {
  starter: "border-blue-500/30 hover:border-blue-500/60",
  pro: "border-purple-500/30 hover:border-purple-500/60 ring-2 ring-purple-500/20",
  enterprise: "border-amber-500/30 hover:border-amber-500/60",
  consumer_free: "border-emerald-500/30 hover:border-emerald-500/60",
  consumer_premium: "border-rose-500/30 hover:border-rose-500/60",
};

const tierDescriptions: Record<string, string> = {
  starter: "Perfect for small teams getting started with micro-learning",
  pro: "For growing organizations that need advanced features",
  enterprise: "Full-featured solution for large enterprises",
  consumer_free: "Try LearnShift with limited access",
  consumer_premium: "Unlock the full personal learning experience",
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function FeatureCheck({ value, isNumber }: { value: boolean | number; isNumber?: boolean }) {
  if (isNumber) {
    const num = value as number;
    return (
      <span className="text-sm font-medium text-foreground">
        {num === -1 ? "Unlimited" : `${num} lessons`}
      </span>
    );
  }
  return value ? (
    <Check className="h-5 w-5 text-emerald-400" />
  ) : (
    <X className="h-5 w-5 text-muted-foreground/40" />
  );
}

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const [annual, setAnnual] = useState(false);
  const { data: plans, isLoading } = trpc.subscription.getPlans.useQuery();
  const checkoutMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const employerPlans = plans?.filter(p => ["starter", "pro", "enterprise"].includes(p.tier)) || [];
  const consumerPlans = plans?.filter(p => ["consumer_free", "consumer_premium"].includes(p.tier)) || [];

  const handleSubscribe = (slug: string) => {
    const cycle = annual ? "yearly" : "monthly";
    if (!isAuthenticated) {
      // Send unauthenticated users to registration with plan pre-selected
      window.location.href = `/register?plan=${slug}&cycle=${cycle}`;
      return;
    }
    checkoutMutation.mutate({
      planSlug: slug,
      cycle,
      quantity: 1,
      origin: window.location.origin,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Smarthinkerz LearnShift" className="h-24 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/library">
              <Button variant="ghost" size="sm">Lesson Library</Button>
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <Link href="/">
                <Button size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 text-center">
        <div className="container max-w-4xl">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" /> Flexible Plans for Every Team
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Choose the Right Plan for Your{" "}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Workforce
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            From individual learners to enterprise teams, we have a plan that fits.
            Start with a 14-day free trial on any employer plan.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <Label htmlFor="billing-toggle" className={!annual ? "text-foreground font-medium" : "text-muted-foreground"}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={annual}
              onCheckedChange={setAnnual}
            />
            <Label htmlFor="billing-toggle" className={annual ? "text-foreground font-medium" : "text-muted-foreground"}>
              Annual
            </Label>
            {annual && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Save ~17%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-16">
        <div className="container max-w-6xl">
          <Tabs defaultValue="employer" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-10">
              <TabsTrigger value="employer" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> For Employers
              </TabsTrigger>
              <TabsTrigger value="consumer" className="flex items-center gap-2">
                <Users className="h-4 w-4" /> For Individuals
              </TabsTrigger>
            </TabsList>

            {/* Employer Plans */}
            <TabsContent value="employer">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse h-[500px] bg-muted/20" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {employerPlans.map((plan) => {
                    const features = plan.features as PlanFeatures | null;
                    const isPro = plan.tier === "pro";
                    const price = annual && plan.priceYearly
                      ? Math.round(plan.priceYearly / 12)
                      : plan.priceMonthly;

                    return (
                      <Card
                        key={plan.id}
                        className={`relative transition-all duration-300 ${tierColors[plan.tier]} ${isPro ? "scale-[1.02]" : ""}`}
                      >
                        {isPro && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Badge className="bg-purple-500 text-white border-0 px-4">
                              Most Popular
                            </Badge>
                          </div>
                        )}
                        <CardHeader className="text-center pb-4">
                          <div className="flex justify-center mb-3">
                            {tierIcons[plan.tier]}
                          </div>
                          <CardTitle className="text-2xl">{plan.name}</CardTitle>
                          <CardDescription className="min-h-[40px]">
                            {tierDescriptions[plan.tier]}
                          </CardDescription>
                          <div className="pt-4">
                            <span className="text-4xl font-bold">{formatPrice(price)}</span>
                            <span className="text-muted-foreground">
                              /user/mo
                            </span>
                          </div>
                          {annual && plan.priceYearly && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatPrice(plan.priceYearly)} billed annually
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Separator />
                          <ul className="space-y-2.5 pt-2">
                            <li className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span>
                                {features?.maxLessons === -1
                                  ? "Unlimited lessons"
                                  : `Up to ${features?.maxLessons || 30} lessons`}
                              </span>
                            </li>
                            {features?.offlineAccess && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>Offline access</span>
                              </li>
                            )}
                            {features?.fullAnalytics && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>Full analytics dashboard</span>
                              </li>
                            )}
                            {features?.contentAuthoring && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>Content authoring studio</span>
                              </li>
                            )}
                            {features?.adaptiveRecommendations && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>AI-powered recommendations</span>
                              </li>
                            )}
                            {features?.scormXapiExport && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>SCORM/xAPI export</span>
                              </li>
                            )}
                            {features?.sso && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>SSO integration</span>
                              </li>
                            )}
                            {features?.whiteLabel && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>White-label branding</span>
                              </li>
                            )}
                            {features?.dedicatedManager && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>Dedicated account manager</span>
                              </li>
                            )}
                            {features?.sla && (
                              <li className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span>SLA guarantee</span>
                              </li>
                            )}
                            {features?.voiceNarration ? (
                              <li className="flex items-center gap-2 text-sm">
                                <Mic className="h-4 w-4 text-purple-400 shrink-0" />
                                <span className="text-purple-300">AI Voice Narration</span>
                              </li>
                            ) : (
                              <li className="flex items-center gap-2 text-sm text-muted-foreground/50">
                                <X className="h-4 w-4 shrink-0" />
                                <span>AI Voice Narration</span>
                              </li>
                            )}
                            <li className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span>
                                {features?.prioritySupport ? "Priority support" : "Email support"}
                              </span>
                            </li>
                          </ul>
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full"
                            variant={isPro ? "default" : "outline"}
                            size="lg"
                            onClick={() => handleSubscribe(plan.slug)}
                            disabled={checkoutMutation.isPending}
                          >
                            {plan.tier === "enterprise" ? "Contact Sales" : "Start 14-Day Trial"}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Consumer Plans */}
            <TabsContent value="consumer">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {consumerPlans.map((plan) => {
                  const features = plan.features as PlanFeatures | null;
                  const isPremium = plan.tier === "consumer_premium";
                  const price = annual && plan.priceYearly
                    ? Math.round(plan.priceYearly / 12)
                    : plan.priceMonthly;

                  return (
                    <Card
                      key={plan.id}
                      className={`relative transition-all duration-300 ${tierColors[plan.tier]} ${isPremium ? "scale-[1.02]" : ""}`}
                    >
                      {isPremium && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-rose-500 text-white border-0 px-4">
                            Recommended
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="text-center pb-4">
                        <div className="flex justify-center mb-3">
                          {tierIcons[plan.tier]}
                        </div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription className="min-h-[40px]">
                          {tierDescriptions[plan.tier]}
                        </CardDescription>
                        <div className="pt-4">
                          {plan.priceMonthly === 0 ? (
                            <span className="text-4xl font-bold">Free</span>
                          ) : (
                            <>
                              <span className="text-4xl font-bold">{formatPrice(price)}</span>
                              <span className="text-muted-foreground">/mo</span>
                            </>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Separator />
                        <ul className="space-y-2.5 pt-2">
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>
                              {features?.maxLessons === -1
                                ? "Unlimited lessons"
                                : `Up to ${features?.maxLessons || 5} lessons`}
                            </span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>Basic progress tracking</span>
                          </li>
                          {features?.offlineAccess && (
                            <li className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span>Offline access</span>
                            </li>
                          )}
                          {features?.adaptiveRecommendations && (
                            <li className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span>AI-powered recommendations</span>
                            </li>
                          )}
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>Gamification & badges</span>
                          </li>
                          <li className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>Push notifications</span>
                          </li>
                          {features?.emailSupport && (
                            <li className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span>Email support</span>
                            </li>
                          )}
                          {features?.voiceNarration ? (
                            <li className="flex items-center gap-2 text-sm">
                              <Mic className="h-4 w-4 text-purple-400 shrink-0" />
                              <span className="text-purple-300">AI Voice Narration</span>
                            </li>
                          ) : (
                            <li className="flex items-center gap-2 text-sm text-muted-foreground/50">
                              <X className="h-4 w-4 shrink-0" />
                              <span>AI Voice Narration</span>
                            </li>
                          )}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          variant={isPremium ? "default" : "outline"}
                          size="lg"
                          onClick={() => handleSubscribe(plan.slug)}
                          disabled={checkoutMutation.isPending}
                        >
                          {plan.priceMonthly === 0 ? "Get Started Free" : "Start Premium"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-muted/20">
        <div className="container max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-2">Feature Comparison</h2>
          <p className="text-muted-foreground text-center mb-10">
            See exactly what's included in each plan
          </p>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground w-1/3">Feature</th>
                  {(plans || []).map(plan => (
                    <th key={plan.id} className="text-center p-4 font-medium">
                      <div className="flex flex-col items-center gap-1">
                        {tierIcons[plan.tier]}
                        <span>{plan.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureLabels.map((feat, idx) => (
                  <tr key={feat.key} className={`border-b border-border/50 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="p-4 text-muted-foreground">{feat.label}</td>
                    {(plans || []).map(plan => {
                      const features = plan.features as PlanFeatures | null;
                      const val = features?.[feat.key];
                      return (
                        <td key={plan.id} className="text-center p-4">
                          <div className="flex justify-center">
                            <FeatureCheck
                              value={val ?? false}
                              isNumber={feat.key === "maxLessons"}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-16">
        <div className="container max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Available Add-Ons</h2>
          <p className="text-muted-foreground mb-10">
            Enhance any plan with these optional add-ons
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Globe className="h-5 w-5" />, name: "Multi-Language Pack", price: "$2/user/mo", desc: "AI-powered translation for all lessons" },
              { icon: <BarChart3 className="h-5 w-5" />, name: "Advanced Analytics", price: "$1.50/user/mo", desc: "Predictive analytics and custom reports" },
              { icon: <Shield className="h-5 w-5" />, name: "Compliance Module", price: "$3/user/mo", desc: "Regulatory tracking and audit trails" },
              { icon: <Headphones className="h-5 w-5" />, name: "Audio Lessons", price: "$1/user/mo", desc: "Text-to-speech for all content" },
              { icon: <Users className="h-5 w-5" />, name: "Extra Seats", price: "$2/user/mo", desc: "Add more learner seats beyond plan limit" },
              { icon: <Sparkles className="h-5 w-5" />, name: "AI Content Gen", price: "$5/mo flat", desc: "Unlimited AI-generated lessons" },
            ].map((addon, i) => (
              <Card key={i} className="text-left transition-all hover:border-primary/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {addon.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{addon.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{addon.desc}</p>
                      <p className="text-sm font-semibold text-primary mt-2">{addon.price}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Can I switch plans at any time?",
                a: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be prorated for the remainder of your billing cycle. When downgrading, the change takes effect at the next billing cycle."
              },
              {
                q: "What happens after the 14-day trial?",
                a: "After your trial ends, you'll be prompted to choose a paid plan. Your data and progress are preserved. If you don't subscribe, your account will be limited to the Free tier features."
              },
              {
                q: "Do you offer volume discounts?",
                a: "Yes! Enterprise plans include custom pricing for organizations with 500+ users. Contact our sales team for a tailored quote."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit and debit cards through our Tap payment gateway. Enterprise customers can also pay via invoice and bank transfer."
              },
              {
                q: "Can I cancel my subscription?",
                a: "Absolutely. You can cancel at any time from your dashboard. Your access continues until the end of your current billing period."
              },
            ].map((faq, i) => (
              <div key={i} className="border border-border rounded-lg p-5 bg-card">
                <h3 className="font-medium text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="container max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Workforce Training?</h2>
          <p className="text-muted-foreground mb-8">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/library">
              <Button size="lg" variant="outline">
                Browse Lessons
              </Button>
            </Link>
            <Button size="lg" onClick={() => handleSubscribe("pro")}>
              Start Free Trial <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Smarthinkerz LearnShift" className="h-16 w-auto" />
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Smarthinkerz LearnShift. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
