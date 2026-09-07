// Create / edit a CRM lead.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CRM_STAGES, type CrmLead } from "@/lib/crm.functions";
import { STAGE_LABELS } from "./pipeline-board";

export type LeadFormValues = {
  id?: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  language: "en" | "de" | "ro";
  stage: string;
  value_amount: string;
  currency: string;
  probability: string;
  notes: string;
  next_action_at: string;
};

const empty: LeadFormValues = {
  company_name: "",
  contact_name: "",
  email: "",
  phone: "",
  country: "",
  language: "en",
  stage: "new",
  value_amount: "",
  currency: "EUR",
  probability: "",
  notes: "",
  next_action_at: "",
};

export function LeadDialog({
  open,
  onOpenChange,
  lead,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead?: CrmLead | null;
  onSubmit: (values: LeadFormValues) => void;
  saving?: boolean;
}) {
  const [v, setV] = useState<LeadFormValues>(empty);

  useEffect(() => {
    if (!open) return;
    setV(
      lead
        ? {
            id: lead.id,
            company_name: lead.company_name,
            contact_name: lead.contact_name ?? "",
            email: lead.email ?? "",
            phone: lead.phone ?? "",
            country: lead.country ?? "",
            language: (lead.language as "en" | "de" | "ro") ?? "en",
            stage: lead.stage,
            value_amount: lead.value_amount != null ? String(lead.value_amount) : "",
            currency: lead.currency,
            probability: lead.probability != null ? String(lead.probability) : "",
            notes: lead.notes ?? "",
            next_action_at: lead.next_action_at ? lead.next_action_at.slice(0, 10) : "",
          }
        : empty,
    );
  }, [open, lead]);

  const set = (k: keyof LeadFormValues, value: string) => setV((p) => ({ ...p, [k]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit lead" : "New lead"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Company</Label>
            <Input value={v.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div>
            <Label>Contact</Label>
            <Input value={v.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={v.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div>
            <Label>Language</Label>
            <Select value={v.language} onValueChange={(x) => set("language", x)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="de">DE</SelectItem>
                <SelectItem value="ro">RO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={v.stage} onValueChange={(x) => set("stage", x)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Estimated value</Label>
            <Input
              type="number"
              min={0}
              value={v.value_amount}
              onChange={(e) => set("value_amount", e.target.value)}
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Input value={v.currency} onChange={(e) => set("currency", e.target.value)} />
          </div>
          <div>
            <Label>Probability (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={v.probability}
              onChange={(e) => set("probability", e.target.value)}
            />
          </div>
          <div>
            <Label>Next action</Label>
            <Input
              type="date"
              value={v.next_action_at}
              onChange={(e) => set("next_action_at", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={saving || !v.company_name.trim()} onClick={() => onSubmit(v)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
