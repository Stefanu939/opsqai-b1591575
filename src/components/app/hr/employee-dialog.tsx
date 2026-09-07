// OPSQAI HR — create / edit employee. Employee ID is assigned by OPSQAI.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveHrEmployee } from "@/lib/hr.functions";
import { contractTypes, type HrCountry, type HrEmployee, type HrRef } from "@/lib/hr/types";
import type { HrUi } from "@/i18n/pages/hr";

const STATUSES = ["onboarding", "active", "leave", "offboarding", "terminated"] as const;

interface Props {
  t: HrUi;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: HrEmployee | null;
  country: HrCountry;
  refs: { departments: HrRef[]; positions: HrRef[]; locations: HrRef[] };
  onSaved: () => void;
}

type Draft = Record<string, string>;

function draftFrom(employee?: HrEmployee | null): Draft {
  return {
    first_name: employee?.first_name ?? "",
    last_name: employee?.last_name ?? "",
    date_of_birth: employee?.date_of_birth?.slice(0, 10) ?? "",
    address: employee?.address ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    department_id: employee?.department_id ?? "",
    position_id: employee?.position_id ?? "",
    location_id: employee?.location_id ?? "",
    start_date: employee?.start_date?.slice(0, 10) ?? "",
    end_date: employee?.end_date?.slice(0, 10) ?? "",
    status: employee?.status ?? "onboarding",
    contract_type: employee?.contract_type ?? "",
    employment_type: employee?.employment_type ?? "",
    notes: employee?.notes ?? "",
  };
}

export function EmployeeDialog({
  t,
  open,
  onOpenChange,
  employee,
  country,
  refs,
  onSaved,
}: Props) {
  const save = useServerFn(saveHrEmployee);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(employee));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setDraft(draftFrom(employee));
  }, [open, employee]);

  const set = (key: string) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const nul = (v: string) => (v.trim() ? v.trim() : null);

  const submit = () => {
    if (!draft.first_name?.trim() || !draft.last_name?.trim()) {
      toast.error(`${t.firstName} / ${t.lastName}`);
      return;
    }
    setBusy(true);
    void save({
      data: {
        ...(employee ? { id: employee.id } : {}),
        values: {
          first_name: draft.first_name!.trim(),
          last_name: draft.last_name!.trim(),
          date_of_birth: nul(draft.date_of_birth ?? ""),
          address: nul(draft.address ?? ""),
          email: nul(draft.email ?? ""),
          phone: nul(draft.phone ?? ""),
          department_id: nul(draft.department_id ?? ""),
          position_id: nul(draft.position_id ?? ""),
          location_id: nul(draft.location_id ?? ""),
          start_date: nul(draft.start_date ?? ""),
          end_date: nul(draft.end_date ?? ""),
          status: (draft.status ?? "onboarding") as HrEmployee["status"],
          contract_type: nul(draft.contract_type ?? ""),
          employment_type: nul(draft.employment_type ?? ""),
          notes: nul(draft.notes ?? ""),
        },
      },
    })
      .then((saved) => {
        toast.success(`${t.saved} — ${saved.employee_no}`);
        onOpenChange(false);
        onSaved();
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(false));
  };

  const text = (key: string, label: string, type = "text") => (
    <div className="grid gap-1.5">
      <Label htmlFor={`hr-${key}`}>{label}</Label>
      <Input
        id={`hr-${key}`}
        type={type}
        value={draft[key] ?? ""}
        onChange={(e) => set(key)(e.target.value)}
      />
    </div>
  );

  const picker = (key: string, label: string, options: Array<{ value: string; label: string }>) => (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={draft[key] || "none"} onValueChange={(v) => set(key)(v === "none" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder={t.all} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {employee ? `${employee.employee_no} — ${t.edit}` : t.newEmployee}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm font-medium text-foreground">{t.personalInformation}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {text("first_name", t.firstName)}
          {text("last_name", t.lastName)}
          {text("date_of_birth", t.dateOfBirth, "date")}
          {text("phone", t.phone)}
          {text("email", t.email, "email")}
          {text("address", t.address)}
        </div>

        <p className="mt-2 text-sm font-medium text-foreground">{t.employment}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {picker(
            "department_id",
            t.department,
            refs.departments.map((r) => ({ value: r.id, label: r.name })),
          )}
          {picker(
            "position_id",
            t.position,
            refs.positions.map((r) => ({ value: r.id, label: r.name })),
          )}
          {picker(
            "location_id",
            t.location,
            refs.locations.map((r) => ({ value: r.id, label: r.name })),
          )}
          {picker(
            "contract_type",
            t.contract,
            contractTypes(country).map((c) => ({ value: c, label: c })),
          )}
          {text("start_date", t.startDate, "date")}
          {text("end_date", t.endDate, "date")}
          {picker(
            "status",
            t.status,
            STATUSES.map((s) => ({ value: s, label: t.statuses[s] ?? s })),
          )}
          {text("employment_type", t.employmentType)}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="hr-notes">{t.notes}</Label>
          <Textarea
            id="hr-notes"
            rows={3}
            value={draft.notes ?? ""}
            onChange={(e) => set("notes")(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {employee ? t.save : t.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
