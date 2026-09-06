// Procedural links and notes: pick a record, read its notes, add a new one.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { NotebookPen, Link2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addTransportNote, listTransportNotes } from "@/lib/transport.functions";
import { useTransportRegisters } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";

type Ui = ReturnType<typeof transportUi>;

type OwnerKind = "vehicle" | "driver" | "carrier" | "incident" | "request";

export function NotesSection({ t }: { t: Ui }) {
  const registers = useTransportRegisters();
  const listFn = useServerFn(listTransportNotes);
  const addFn = useServerFn(addTransportNote);
  const [ownerKind, setOwnerKind] = useState<OwnerKind>("vehicle");
  const [ownerId, setOwnerId] = useState<string>("");
  const [body, setBody] = useState("");

  const owners = useMemo(() => {
    const d = registers.data;
    if (!d) return [] as Array<{ value: string; label: string }>;
    if (ownerKind === "vehicle")
      return d.vehicles.map((v) => ({ value: v.id, label: v.plate }));
    if (ownerKind === "driver")
      return d.drivers.map((v) => ({ value: v.id, label: v.full_name }));
    if (ownerKind === "carrier")
      return d.carriers.map((v) => ({ value: v.id, label: v.name }));
    if (ownerKind === "incident")
      return d.incidents.map((v) => ({ value: v.id, label: v.title }));
    return d.requests.map((v) => ({ value: v.id, label: v.title }));
  }, [registers.data, ownerKind]);

  const notes = useQuery({
    queryKey: ["transport", "notes", ownerKind, ownerId],
    enabled: Boolean(ownerId),
    retry: false,
    queryFn: () => listFn({ data: { ownerKind, ownerId } }),
  });

  const canEdit = registers.data?.grants.includes("edit") ?? false;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Panel icon={Link2} title={t.owner} description={t.selfHostedOnly}>
        <div className="grid gap-3">
          <Select
            value={ownerKind}
            onValueChange={(v) => {
              setOwnerKind(v as OwnerKind);
              setOwnerId("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vehicle">{t.vehicle}</SelectItem>
              <SelectItem value="driver">{t.driver}</SelectItem>
              <SelectItem value="carrier">{t.carrier}</SelectItem>
              <SelectItem value="incident">{t.incidentRegister}</SelectItem>
              <SelectItem value="request">{t.requestRegister}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {owners.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Panel>

      <Panel icon={NotebookPen} title={t.notes} description={t.auditBody}>
        {!ownerId ? (
          <EmptyState title={t.none} description={t.selfHostedOnly} />
        ) : (
          <>
            {!notes.data?.length ? (
              <EmptyState title={t.none} />
            ) : (
              <ul className="divide-y divide-border">
                {notes.data.map((n) => (
                  <li key={n.id} className="py-2">
                    <p className="text-sm">{n.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {n.author_name ?? ""} · {new Date(n.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {canEdit ? (
              <div className="mt-4 grid gap-2">
                <Textarea
                  rows={3}
                  value={body}
                  placeholder={t.notes}
                  onChange={(e) => setBody(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!body.trim()}
                  onClick={() => {
                    void addFn({ data: { ownerKind, ownerId, body: body.trim() } })
                      .then(() => {
                        setBody("");
                        return notes.refetch();
                      })
                      .catch((e: Error) => toast.error(e.message));
                  }}
                >
                  {t.add}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </div>
  );
}
