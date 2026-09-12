// OPSQAI Transport — trip planner (Self-Hosted only).
//
// A route plus a departure time becomes a real plan: driving time, the breaks
// and daily rest the driving rules require, the estimated arrival, the fuel
// estimate and a pre-departure checklist built from the company's own records.
// The finished plan can be saved, exported as PDF and sent to the driver on
// WhatsApp.
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  Info,
  MessageCircle,
  Route as RouteIcon,
  Save,
  Trash2,
} from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteTransportTrip,
  exportTransportTripPdf,
  getTransportTrip,
  listTransportTrips,
  planTransportTrip,
  saveTransportTrip,
  sendTransportTripToDriver,
} from "@/lib/transport.functions";
import { formatMinutes } from "@/lib/transport/trip-planner";
import { downloadBase64 } from "./download";
import { useTransportMapData, useTransportRegisters } from "./use-transport";
import { useT } from "@/i18n";
import type { transportUi } from "@/i18n/pages/transport";
import type { TripPlan } from "@/lib/transport/types";

const TransportMap = lazy(() => import("./transport-map"));

type Ui = ReturnType<typeof transportUi>;

function localInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function shortTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

export function TripPlannerSection({ t }: { t: Ui }) {
  const { lang } = useT();
  const uiLang: "en" | "de" | "ro" = lang === "de" ? "de" : lang === "ro" ? "ro" : "en";
  const map = useTransportMapData();
  const registers = useTransportRegisters();
  const plan = useServerFn(planTransportTrip);
  const save = useServerFn(saveTransportTrip);
  const remove = useServerFn(deleteTransportTrip);
  const exportPdf = useServerFn(exportTransportTripPdf);
  const sendWhatsapp = useServerFn(sendTransportTripToDriver);
  const listFn = useServerFn(listTransportTrips);
  const openFn = useServerFn(getTransportTrip);

  const trips = useQuery({
    queryKey: ["transport", "trips"],
    queryFn: () => listFn(),
    retry: false,
  });

  const vehicles = map.data?.vehicles ?? [];
  // Drivers come from the driver register, not from GPS pins: a newly added
  // driver has no position yet and must still be selectable for a trip.
  const drivers = useMemo(
    () =>
      (registers.data?.drivers ?? [])
        .filter((d) => d.status !== "inactive")
        .map((d) => ({ id: d.id, label: d.full_name, phone: d.phone ?? null })),
    [registers.data?.drivers],
  );

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [stops, setStops] = useState<string[]>([]);
  const [departAt, setDepartAt] = useState(() => localInputValue(new Date(Date.now() + 3_600_000)));
  const [vehicleId, setVehicleId] = useState<string>("");
  const [driverId, setDriverId] = useState<string>("");
  const [profile, setProfile] = useState<"truck" | "van" | "car">("truck");
  const [preference, setPreference] = useState<"fast" | "short" | "no_tolls">("fast");
  const [alreadyDriven, setAlreadyDriven] = useState(0);
  const [stopMinutes, setStopMinutes] = useState(30);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TripPlan | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const pauses = (result?.legs ?? []).filter((l) => l.kind === "break" || l.kind === "rest");

  const calculate = () => {
    if (!origin.trim() || !destination.trim()) {
      toast.error(t.tripNeedCoordinates);
      return;
    }
    setBusy(true);
    void plan({
      data: {
        lang: uiLang,
        origin: { label: origin.trim() },
        destination: { label: destination.trim() },
        stops: stops.filter((s) => s.trim()).map((s) => ({ label: s.trim() })),
        departAt: new Date(departAt).toISOString(),
        vehicleId: vehicleId || null,
        driverId: driverId || null,
        vehicleProfile: profile,
        routePreference: preference,
        alreadyDrivenMinutes: alreadyDriven,
        stopMinutes,
      },
    })
      .then((r) => {
        setResult(r.plan as TripPlan);
        if (r.plan.driverPhone && !phone) setPhone(r.plan.driverPhone);
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(false));
  };

  const openTrip = (id: string) => {
    void openFn({ data: { id } })
      .then((r) => {
        const trip = r.trip;
        if (!trip) return;
        setSavedId(trip.id);
        setName(trip.name ?? "");
        setOrigin(trip.origin_label);
        setDestination(trip.destination_label);
        setDepartAt(localInputValue(new Date(trip.depart_at)));
        setVehicleId(trip.vehicle_id ?? "");
        setDriverId(trip.driver_id ?? "");
        setProfile(trip.vehicle_profile);
        setPreference(trip.route_preference);
        setPhone(trip.driver_phone ?? trip.whatsapp_to ?? "");
        setResult({
          origin: {
            label: trip.origin_label,
            lat: trip.origin_lat,
            lng: trip.origin_lng,
          },
          destination: {
            label: trip.destination_label,
            lat: trip.destination_lat,
            lng: trip.destination_lng,
          },
          stops: trip.stops ?? [],
          departAt: trip.depart_at,
          arrivalAt: trip.arrival_at ?? trip.depart_at,
          distanceKm: trip.distance_km ?? 0,
          driveMinutes: trip.drive_minutes ?? 0,
          totalMinutes: trip.total_minutes ?? 0,
          fuelLitres: trip.fuel_litres,
          tollAmount: trip.toll_amount,
          tollCurrency: trip.toll_currency,
          routeSource: trip.route_source,
          geometry: trip.route_geometry ?? [],
          legs: trip.legs ?? [],
          checks: trip.checks ?? [],
          vehicleProfile: trip.vehicle_profile,
          routePreference: trip.route_preference,
          vehicleId: trip.vehicle_id,
          vehiclePlate: trip.vehicle_plate ?? null,
          trailerId: trip.trailer_id,
          driverId: trip.driver_id,
          driverName: trip.driver_name ?? null,
          driverPhone: trip.driver_phone ?? null,
          alternatives: [],
        });
      })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <div className="grid gap-4">
      <Panel icon={RouteIcon} title={t.tripPlanner} description={t.tripPlannerBody}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>{t.tripFrom}</Label>
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="…" />
          </div>
          <div className="grid gap-1.5">
            <Label>{t.tripTo}</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="…"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t.tripDepart}</Label>
            <Input
              type="datetime-local"
              value={departAt}
              onChange={(e) => setDepartAt(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t.tripProfile}</Label>
            <Select value={profile} onValueChange={(v) => setProfile(v as typeof profile)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="truck">{t.tripProfileTruck}</SelectItem>
                <SelectItem value="van">{t.tripProfileVan}</SelectItem>
                <SelectItem value="car">{t.tripProfileCar}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t.vehicle}</Label>
            <Select value={vehicleId || "none"} onValueChange={(v) => setVehicleId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t.driver}</Label>
            <Select
              value={driverId || "none"}
              onValueChange={(v) => {
                const id = v === "none" ? "" : v;
                setDriverId(id);
                // Prefill the WhatsApp number from the driver record.
                const picked = drivers.find((d) => d.id === id);
                if (picked?.phone) setPhone(picked.phone);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{t.tripPreference}</Label>
            <Select value={preference} onValueChange={(v) => setPreference(v as typeof preference)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fast">{t.tripPreferenceFast}</SelectItem>
                <SelectItem value="short">{t.tripPreferenceShort}</SelectItem>
                <SelectItem value="no_tolls">{t.tripPreferenceNoTolls}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t.tripAlreadyDriven}</Label>
              <Input
                type="number"
                min={0}
                max={540}
                value={alreadyDriven}
                onChange={(e) => setAlreadyDriven(Number(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t.tripStopMinutes}</Label>
              <Input
                type="number"
                min={0}
                max={240}
                value={stopMinutes}
                onChange={(e) => setStopMinutes(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {stops.map((stop, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={stop}
                onChange={(e) =>
                  setStops((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))
                }
                placeholder={t.tripStops}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setStops((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={stops.length >= 8}
              onClick={() => setStops((prev) => [...prev, ""])}
            >
              {t.tripAddStop}
            </Button>
            <Button size="sm" disabled={busy} onClick={calculate}>
              {result ? t.tripRecalculate : t.tripCalculate}
            </Button>
          </div>
        </div>
      </Panel>

      {result ? (
        <>
          <Panel icon={RouteIcon} title={t.tripPlan}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [t.tripDistance, `${result.distanceKm} km`],
                [t.tripDrive, formatMinutes(result.driveMinutes)],
                [t.tripTotal, formatMinutes(result.totalMinutes)],
                [t.tripArrive, shortTime(result.arrivalAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-card/60 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-lg font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={result.routeSource === "offline" ? "outline" : "secondary"}>
                {t.tripSource}: {result.routeSource === "offline" ? t.tripOffline : t.tripOnline}
              </Badge>
              {result.fuelLitres != null ? (
                <Badge variant="outline">
                  {t.tripFuel}: {result.fuelLitres} l
                </Badge>
              ) : null}
              {result.alternatives.map((alt) => (
                <Badge key={alt.label} variant="outline">
                  {t.tripAlternatives} {alt.label}: {alt.distanceKm} km ·{" "}
                  {formatMinutes(alt.driveMinutes)}
                </Badge>
              ))}
            </div>

            {result.geometry.length > 1 ? (
              <div className="mt-4">
                <Suspense fallback={<div className="h-72 rounded-lg border border-border" />}>
                  <TransportMap
                    pins={[]}
                    zones={[]}
                    className="h-72 w-full rounded-lg border border-border"
                    route={{
                      geometry: result.geometry,
                      stops: result.stops.map((s) => ({
                        label: s.label,
                        lat: s.latitude,
                        lng: s.longitude,
                      })),
                      pauses: pauses.map((p) => ({
                        label: `${p.kind === "rest" ? t.tripRest : t.tripBreak} · ${formatMinutes(p.minutes)}`,
                        lat: p.latitude,
                        lng: p.longitude,
                      })),
                    }}
                  />
                </Suspense>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.tripName}
              />
              <Button
                variant="outline"
                onClick={() => {
                  void save({
                    data: { plan: result, id: savedId, name: name || null },
                  })
                    .then((r) => {
                      setSavedId(r.id);
                      toast.success(t.tripSaved);
                      void trips.refetch();
                    })
                    .catch((e: Error) => toast.error(e.message));
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                {t.tripSave}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void exportPdf({ data: { plan: result, lang: uiLang, name: name || null } })
                    .then((r) => downloadBase64(r.filename, r.base64))
                    .catch((e: Error) => toast.error(e.message));
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                {t.exportPdf}
              </Button>
            </div>
          </Panel>

          <Panel icon={RouteIcon} title={t.tripTimeline}>
            <ul className="divide-y divide-border">
              {result.legs.map((leg) => (
                <li key={leg.position} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <span className="w-40 text-muted-foreground">
                    {shortTime(leg.start_at)} → {shortTime(leg.end_at)}
                  </span>
                  <Badge variant={leg.kind === "drive" ? "secondary" : "outline"}>
                    {leg.kind === "drive"
                      ? t.tripDriveLeg
                      : leg.kind === "break"
                        ? t.tripBreak
                        : leg.kind === "rest"
                          ? t.tripRest
                          : t.tripStop}
                  </Badge>
                  <span className="font-medium">{formatMinutes(leg.minutes)}</span>
                  {leg.distance_km ? (
                    <span className="text-muted-foreground">{leg.distance_km} km</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={AlertTriangle} title={t.tripChecks}>
            {result.checks.length === 0 ? (
              <EmptyState title={t.tripChecksClear} />
            ) : (
              <ul className="divide-y divide-border">
                {result.checks.map((check, i) => (
                  <li key={`${check.title}-${i}`} className="flex items-start gap-2 py-2 text-sm">
                    {check.severity === "info" ? (
                      <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    ) : (
                      <AlertTriangle
                        className={`mt-0.5 h-4 w-4 ${check.severity === "critical" ? "text-destructive" : "text-amber-500"}`}
                      />
                    )}
                    <span>
                      <span className="font-medium">{check.title}</span>
                      {check.detail ? (
                        <span className="text-muted-foreground"> — {check.detail}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel icon={MessageCircle} title={t.tripSendWhatsapp}>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <div className="grid gap-1.5">
                <Label>{t.tripWhatsappPhone}</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 170 1234567"
                />
              </div>
              <Button
                className="self-end"
                disabled={phone.trim().length < 6}
                onClick={() => {
                  void sendWhatsapp({
                    data: { plan: result, lang: uiLang, phone: phone.trim(), tripId: savedId },
                  })
                    .then((r) => {
                      if (r.mode === "twilio") {
                        toast.success(t.tripWhatsappSent);
                        return;
                      }
                      toast.success(t.tripWhatsappPrepared);
                      if (r.link) window.open(r.link, "_blank", "noopener,noreferrer");
                    })
                    .catch((e: Error) => toast.error(e.message));
                }}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {t.tripWhatsappOpen}
              </Button>
            </div>
          </Panel>
        </>
      ) : null}

      <Panel icon={RouteIcon} title={t.tripSavedTrips}>
        {(trips.data?.trips ?? []).length === 0 ? (
          <EmptyState title={t.tripNoTrips} />
        ) : (
          <ul className="divide-y divide-border">
            {(trips.data?.trips ?? []).map((trip) => (
              <li key={trip.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="font-medium">
                  {trip.name || `${trip.origin_label} → ${trip.destination_label}`}
                </span>
                <span className="text-muted-foreground">{shortTime(trip.depart_at)}</span>
                {trip.vehicle_plate ? <Badge variant="outline">{trip.vehicle_plate}</Badge> : null}
                {trip.whatsapp_sent_at ? (
                  <Badge variant="secondary">WhatsApp</Badge>
                ) : null}
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openTrip(trip.id)}>
                    {t.tripPlan}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void remove({ data: { id: trip.id } })
                        .then(() => {
                          toast.success(t.tripDeleted);
                          if (savedId === trip.id) setSavedId(null);
                          void trips.refetch();
                        })
                        .catch((e: Error) => toast.error(e.message));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
