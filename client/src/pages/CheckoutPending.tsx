import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Home, RefreshCw } from "lucide-react";

export function CheckoutPending() {
  const [, navigate] = useLocation();

  // Auto-refresh after 10 seconds to check if payment completed
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.reload();
    }, 10_000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-amber-500/20">
        <CardHeader className="text-center">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="h-6 w-6 text-amber-500 animate-pulse" />
          </div>
          <CardTitle className="text-amber-600">Payment Pending</CardTitle>
          <CardDescription>Your payment is being processed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
            <p className="text-sm text-amber-700 font-medium mb-2">What's happening?</p>
            <ul className="text-sm text-amber-600 space-y-1 list-disc list-inside">
              <li>Your bank is authorising the payment</li>
              <li>This usually takes less than a minute</li>
              <li>Do not close this page</li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            This page will refresh automatically in 10 seconds…
          </p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Check Status Now
            </Button>
            <Button onClick={() => navigate("/pricing")} variant="outline" className="w-full gap-2">
              <Home className="h-4 w-4" />
              Back to Pricing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
