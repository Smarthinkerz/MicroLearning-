import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Users, BookOpen, TrendingUp, Calendar, CheckCircle2, Clock, Target } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { useEntitlements } from "@/hooks/useEntitlements";

export default function Analytics() {
  const { user } = useAuth();
  const orgId = (user as any)?.orgId;
  const { can } = useEntitlements();

  const { data: stats, isLoading } = trpc.org.getStats.useQuery(
    { orgId: orgId! },
    { enabled: !!orgId }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Organization learning performance overview.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const completionRate = stats?.completionRate ?? 0;
  const totalAssignments = stats?.totalAssignments ?? 0;
  const completedAssignments = stats?.completedAssignments ?? 0;
  const inProgressAssignments = stats?.inProgressAssignments ?? 0;
  const pendingAssignments = totalAssignments - completedAssignments - inProgressAssignments;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Organization learning performance overview.</p>
      </div>

      {/* KPI Cards - basic tracking available to all */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Total Learners" value={stats?.totalUsers ?? 0} color="text-blue-400" />
        <KPICard icon={BookOpen} label="Published Lessons" value={stats?.totalLessons ?? 0} color="text-green-400" />
        <KPICard icon={Target} label="Completion Rate" value={`${completionRate}%`} color="text-primary" />
        <KPICard icon={Calendar} label="Active Shifts" value={stats?.totalShifts ?? 0} color="text-purple-400" />
      </div>

      {/* Detailed Stats - gated behind fullAnalytics (Pro+) */}
      <FeatureGate feature="fullAnalytics">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Assignment Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Assignment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">Total Assignments</span>
                <span className="text-sm font-semibold text-foreground">{totalAssignments}</span>
              </div>
            </div>
            <ProgressRow label="Completed" value={completedAssignments} total={totalAssignments} color="bg-green-500" />
            <ProgressRow label="In Progress" value={inProgressAssignments} total={totalAssignments} color="bg-blue-500" />
            <ProgressRow label="Pending" value={pendingAssignments} total={totalAssignments} color="bg-muted-foreground" />
          </CardContent>
        </Card>

        {/* Completion Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Completion Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="relative h-40 w-40">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                    className="text-primary"
                    strokeDasharray={`${completionRate * 2.51} ${251 - completionRate * 2.51}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center mt-4">
              <div>
                <p className="text-lg font-bold text-green-400">{completedAssignments}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">{inProgressAssignments}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div>
                <p className="text-lg font-bold text-muted-foreground">{pendingAssignments}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </FeatureGate>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function ProgressRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground">{value} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
