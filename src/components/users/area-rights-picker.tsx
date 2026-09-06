import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";
import { AREA_ACTIONS, AREA_LABELS, type AreaAction, type AreaRightChoice } from "@/lib/area-rights";

interface CatalogItem { areaKey: string; action: AreaAction; permissionKey: string }

export function AreaRightsPicker({ catalog, value, onChange, unrestricted, disabled }: {
  catalog: CatalogItem[]; value: AreaRightChoice[]; onChange: (value: AreaRightChoice[]) => void;
  unrestricted?: boolean; disabled?: boolean;
}) {
  if (unrestricted) return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="text-muted-foreground">Owner and SuperAdmin accounts have permanent full access. Restrictions cannot be applied.</span>
    </div>
  );
  const areas = Array.from(new Set(catalog.map((item) => item.areaKey)));
  const selected = new Map(value.map((item) => [`${item.area}:${item.action}`, item.granted]));
  const toggle = (area: string, action: AreaAction) => {
    const key = `${area}:${action}`;
    const next = catalog.map((item) => ({ area: item.areaKey, action: item.action, granted: selected.get(`${item.areaKey}:${item.action}`) ?? false }));
    const item = next.find((candidate) => `${candidate.area}:${candidate.action}` === key);
    if (item) item.granted = !(selected.get(key) ?? false);
    onChange(next);
  };
  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="grid min-w-[680px] grid-cols-[minmax(150px,1fr)_repeat(6,72px)] border-b bg-muted/30 px-3 py-2 text-[10px] uppercase text-muted-foreground">
        <span>Functional area</span>{AREA_ACTIONS.map((action) => <span key={action} className="text-center">{action}</span>)}
      </div>
      {areas.map((area) => (
        <div key={area} className="grid min-w-[680px] grid-cols-[minmax(150px,1fr)_repeat(6,72px)] items-center border-b px-3 py-2 last:border-b-0">
          <span className="text-sm font-medium">{AREA_LABELS[area] ?? area}</span>
          {AREA_ACTIONS.map((action) => {
            const available = catalog.some((item) => item.areaKey === area && item.action === action);
            return <div key={action} className="flex justify-center"><Checkbox disabled={disabled || !available} checked={available && (selected.get(`${area}:${action}`) ?? false)} onCheckedChange={() => toggle(area, action)} /></div>;
          })}
        </div>
      ))}
    </div>
  );
}