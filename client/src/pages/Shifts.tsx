import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Plus, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Shifts() {
  const { user } = useAuth();
  const orgId = (user as any)?.orgId;
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [referenceTime] = useState(() => Date.now());

  const now = referenceTime;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  const twoWeeksAhead = now + 14 * 24 * 60 * 60 * 1000;

  const { data: shifts, isLoading } = trpc.shift.getMyShifts.useQuery({
    startRange: twoWeeksAgo,
    endRange: twoWeeksAhead,
  });

  const createShift = trpc.shift.create.useMutation({
    onSuccess: () => {
      utils.shift.getMyShifts.invalidate();
      setDialogOpen(false);
      toast.success("Shift added");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteShift = trpc.shift.delete.useMutation({
    onSuccess: () => {
      utils.shift.getMyShifts.invalidate();
      toast.success("Shift deleted");
    },
  });

  const [form, setForm] = useState({
    title: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    shiftType: "custom" as const,
    location: "",
  });

  const handleCreate = () => {
    if (!form.startDate || !form.startTime || !form.endDate || !form.endTime) {
      toast.error("Please fill in all date/time fields");
      return;
    }
    const startTime = new Date(`${form.startDate}T${form.startTime}`).getTime();
    const endTime = new Date(`${form.endDate}T${form.endTime}`).getTime();
    if (endTime <= startTime) {
      toast.error("End time must be after start time");
      return;
    }
    createShift.mutate({
      userId: user!.id,
      orgId: orgId || 0,
      title: form.title || undefined,
      startTime,
      endTime,
      shiftType: form.shiftType,
      location: form.location || undefined,
    });
  };

  const shiftTypeColor = (type: string) => {
    switch (type) {
      case "morning": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
      case "afternoon": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "night": return "text-indigo-400 bg-indigo-400/10 border-indigo-400/20";
      case "split": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default: return "";
    }
  };

  const groupedShifts = (shifts || []).reduce((acc: Record<string, any[]>, shift: any) => {
    const date = new Date(shift.startTime).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(shift);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Shifts</h1>
          <p className="text-muted-foreground">Manage your work schedule for shift-aware lesson delivery.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Shift
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title (optional)</Label>
                <Input
                  placeholder="e.g. Morning Shift"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Shift Type</Label>
                  <Select value={form.shiftType} onValueChange={(v: any) => setForm({ ...form, shiftType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="split">Split</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location (optional)</Label>
                  <Input
                    placeholder="Building A"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createShift.isPending}>
                {createShift.isPending ? "Adding..." : "Add Shift"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : Object.keys(groupedShifts).length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No shifts scheduled. Add your first shift to enable schedule-aware learning.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedShifts).map(([date, dayShifts]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
              <div className="space-y-2">
                {(dayShifts as any[]).map((shift) => {
                  const isPast = shift.endTime < now;
                  const isActive = shift.startTime <= now && shift.endTime >= now;
                  return (
                    <Card key={shift.id} className={`${isActive ? "border-primary/50" : ""} ${isPast ? "opacity-60" : ""}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/20" : "bg-secondary"}`}>
                              <Clock className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {shift.title || `${shift.shiftType} shift`}
                                </span>
                                {isActive && <Badge className="text-[10px] bg-primary/20 text-primary border-0">Active</Badge>}
                                <Badge variant="outline" className={`text-[10px] ${shiftTypeColor(shift.shiftType)}`}>
                                  {shift.shiftType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                <span>
                                  {new Date(shift.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  {" - "}
                                  {new Date(shift.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {shift.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {shift.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => deleteShift.mutate({ id: shift.id })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
