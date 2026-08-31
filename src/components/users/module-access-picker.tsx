// Module access picker used when creating or editing a non-SuperAdmin user.
// SuperAdmins are unrestricted, so the picker renders a locked notice instead.
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  LICENSE_MODULE_CATALOG,
  moduleClassification,
  type ModuleKey,
} from "@/lib/license-modules";
import { ROLE_MODULE_PRESETS, normalizeAppRole } from "@/lib/module-access";
import { ShieldCheck } from "lucide-react";

export function presetModulesFor(role: string, licensed: string[]): ModuleKey[] {
  const preset = ROLE_MODULE_PRESETS[normalizeAppRole(role)] ?? [];
  const allowed = new Set(licensed);
  return preset.filter((m) => allowed.has(m));
}

interface Props {
  role: string;
  licensed: string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

export function ModuleAccessPicker({ role, licensed, value, onChange, disabled }: Props) {
  const isSuperadmin = normalizeAppRole(role) === "superadmin";

  if (isSuperadmin) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <span className="text-muted-foreground">
          SuperAdmins have unrestricted access to every installed and licensed module. Module
          restrictions cannot be applied to this role.
        </span>
      </div>
    );
  }

  const allowed = LICENSE_MODULE_CATALOG.filter((m) => licensed.includes(m.key));
  const categories = Array.from(new Set(allowed.map((m) => m.category)));
  const selected = new Set(value);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {selected.size} of {allowed.length} modules selected
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange(presetModulesFor(role, licensed))}
          >
            Role preset
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange(allowed.map((m) => m.key))}
          >
            All
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            None
          </Button>
        </div>
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border p-3">
        {categories.map((cat) => (
          <Fragment key={cat}>
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {cat}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {allowed
                .filter((m) => m.category === cat)
                .map((m) => (
                  <label
                    key={m.key}
                    className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(m.key)}
                      disabled={disabled}
                      onCheckedChange={() => toggle(m.key)}
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-sm">
                        <span className="truncate">{m.label}</span>
                        {moduleClassification(m.key) === "core" ? (
                          <Badge variant="outline" className="text-[9px]">
                            Core
                          </Badge>
                        ) : null}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          </Fragment>
        ))}
        {allowed.length === 0 ? (
          <div className="text-sm text-muted-foreground">No entitlements available.</div>
        ) : null}
      </div>
    </div>
  );
}
