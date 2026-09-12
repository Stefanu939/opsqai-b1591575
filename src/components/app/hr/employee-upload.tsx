// OPSQAI HR — upload any file straight into the employee file (contract scan,
// certificate, ID copy). The document lands in the employee's document list and
// is auditable like every other HR document.
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadHrDocument } from "@/lib/hr-ext.functions";
import type { HrPayrollUi } from "@/i18n/pages/hr-payroll";
import { useHrExtRefresh } from "./use-hr-ext";

const MAX_BYTES = 12 * 1024 * 1024;

export function EmployeeUploadCard({
  employeeId,
  t,
}: {
  employeeId: string;
  t: HrPayrollUi;
}) {
  const upload = useServerFn(uploadHrDocument);
  const refresh = useHrExtRefresh();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const onPick = (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error(t.fileTooLarge);
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1] ?? "";
      void upload({
        data: {
          employeeId,
          kind: "other",
          title: title.trim() || file.name,
          filename: file.name,
          mime: file.type || "application/octet-stream",
          base64,
          validUntil: null,
        },
      })
        .then(() => {
          toast.success(t.saved);
          setTitle("");
          void refresh();
        })
        .catch((e: Error) => toast.error(e.message))
        .finally(() => setBusy(false));
    };
    reader.onerror = () => {
      setBusy(false);
      toast.error(t.uploadFailed);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Panel icon={Upload} title={t.uploadToFile} description={t.uploadToFileHint}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-64"
          placeholder={t.documentTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
            e.target.value = "";
          }}
        />
        <Button disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1.5 size-4" /> {busy ? t.uploading : t.chooseFile}
        </Button>
      </div>
    </Panel>
  );
}
