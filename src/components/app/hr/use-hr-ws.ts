// OPSQAI HR — client hooks for the workflow workspaces (0044).
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useT } from "@/i18n";
import {
  getHrAssetPackages,
  getHrCompliance,
  getHrIntelligence,
  getHrKnowledge,
  getHrLifecycle,
  getHrPolicies,
  getHrRequests,
  getHrTraining,
} from "@/lib/hr-ws.functions";
import { getHrDocumentLibrary } from "@/lib/hr-ext.functions";

type Lang = "en" | "de" | "ro";
export function useHrLang(): Lang {
  const { lang } = useT();
  return lang === "de" || lang === "ro" ? lang : "en";
}

export function useHrLifecycle() {
  const fn = useServerFn(getHrLifecycle);
  const language = useHrLang();
  return useQuery({ queryKey: ["hr", "lifecycle", language], queryFn: () => fn({ data: { language } }) });
}

export function useHrAssetPackages() {
  const fn = useServerFn(getHrAssetPackages);
  const language = useHrLang();
  return useQuery({ queryKey: ["hr", "asset-packages", language], queryFn: () => fn({ data: { language } }) });
}

export function useHrPolicies() {
  const fn = useServerFn(getHrPolicies);
  const language = useHrLang();
  return useQuery({ queryKey: ["hr", "policies", language], queryFn: () => fn({ data: { language } }) });
}

export function useHrRequests() {
  const fn = useServerFn(getHrRequests);
  return useQuery({ queryKey: ["hr", "requests"], queryFn: () => fn() });
}

export function useHrKnowledge(search?: string) {
  const fn = useServerFn(getHrKnowledge);
  return useQuery({
    queryKey: ["hr", "knowledge", search ?? ""],
    queryFn: () => fn({ data: search ? { search } : {} }),
  });
}

export function useHrTraining() {
  const fn = useServerFn(getHrTraining);
  const language = useHrLang();
  return useQuery({ queryKey: ["hr", "training", language], queryFn: () => fn({ data: { language } }) });
}

export function useHrCompliance() {
  const fn = useServerFn(getHrCompliance);
  const language = useHrLang();
  return useQuery({ queryKey: ["hr", "compliance", language], queryFn: () => fn({ data: { language } }) });
}

export function useHrIntelligence() {
  const fn = useServerFn(getHrIntelligence);
  return useQuery({ queryKey: ["hr", "intelligence"], queryFn: () => fn() });
}

export function useHrDocumentLibrary() {
  const fn = useServerFn(getHrDocumentLibrary);
  return useQuery({ queryKey: ["hr", "document-library"], queryFn: () => fn() });
}
