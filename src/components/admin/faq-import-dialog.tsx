/**
 * Bulk FAQ import dialog: pick a CSV/XLSX/PDF/DOCX file, preview the parsed
 * rows (with inline edit + per-row include toggle), then import. Works
 * identically on Cloud and Self-Hosted — parsing and writes happen through
 * platform-agnostic server functions.
 */
import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, AlertCircle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { parseFaqImport, importFaqs } from "@/lib/faq-import.functions";
import { toast } from "sonner";

interface PreviewRow {
  question_de: string;
  question_en: string;
  answer_de: string;
  answer_en: string;
  category: string;
  is_active: boolean;
  error: string | null;
  include: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId?: string | null;
  onImported: () => void;
}

export function FaqImportDialog({ open, onOpenChange, companyId, onImported }: Props) {
  const parse = useServerFn(parseFaqImport);
  const doImport = useServerFn(importFaqs);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [filename, setFilename] = useState<string>("");

  const reset = () => {
    setRows([]);
    setFilename("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      const data_base64 = btoa(binary);
      const res = await parse({
        data: {
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          data_base64,
        },
      });
      setRows(
        res.rows.map((r) => ({
          ...r,
          include: !r.error,
        })),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      reset();
    } finally {
      setBusy(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const onImport = async () => {
    const toImport = rows.filter((r) => r.include && !r.error);
    if (toImport.length === 0) {
      toast.error("No valid rows selected");
      return;
    }
    setImporting(true);
    try {
      const res = await doImport({
        data: {
          rows: toImport.map((r) => ({
            question_de: r.question_de,
            question_en: r.question_en,
            answer_de: r.answer_de,
            answer_en: r.answer_en,
            category: r.category,
          })),
          company_id: companyId ?? undefined,
        },
      });
      toast.success(`Imported ${res.created} FAQ${res.created === 1 ? "" : "s"}${res.skipped ? `, ${res.skipped} skipped` : ""}`);
      reset();
      onOpenChange(false);
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const includedCount = rows.filter((r) => r.include && !r.error).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import FAQs</DialogTitle>
          <DialogDescription>
            Upload a CSV, XLSX, PDF or DOCX file. Spreadsheets are parsed directly (columns:
            question/answer/category); PDF and DOCX text is analyzed by AI to propose Q&amp;A
            pairs. Review and edit before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.pdf,.docx"
              onChange={onFileSelected}
              disabled={busy}
              className="max-w-sm"
            />
            {busy && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Parsing {filename}…
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Question (EN)</TableHead>
                    <TableHead>Answer (EN)</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={idx} className={r.error ? "bg-destructive/5" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={r.include}
                          disabled={!!r.error}
                          onCheckedChange={(c) => updateRow(idx, { include: c === true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="min-w-[100px]"
                          value={r.category}
                          onChange={(e) => updateRow(idx, { category: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="min-w-[220px]"
                          value={r.question_en}
                          onChange={(e) =>
                            updateRow(idx, { question_en: e.target.value, question_de: r.question_de })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="min-w-[260px]"
                          value={r.answer_en}
                          onChange={(e) =>
                            updateRow(idx, { answer_en: e.target.value, answer_de: r.answer_de })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {r.error && (
                          <span title={r.error}>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onImport}
            disabled={importing || includedCount === 0}
            className="w-full sm:w-auto"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import {includedCount > 0 ? `(${includedCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
