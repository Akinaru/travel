import type { Booking } from "@/db/schema";
import { CarIcon, FileIcon, HomeIcon, PlaneIcon, TrainIcon } from "./icons";
import { Badge } from "./ui";

export const KIND_LABEL: Record<Booking["kind"], string> = {
  vol: "Vol",
  train: "Train",
  bus: "Bus",
  voiture: "Voiture",
  logement: "Logement",
  autre: "Autre",
};

export function KindIcon({ kind, size = 20 }: { kind: Booking["kind"]; size?: number }) {
  if (kind === "vol") return <PlaneIcon size={size} />;
  if (kind === "train") return <TrainIcon size={size} />;
  if (kind === "bus" || kind === "voiture") return <CarIcon size={size} />;
  if (kind === "logement") return <HomeIcon size={size} />;
  return <FileIcon size={size} />;
}

export function BookingStatus({ status }: { status: Booking["status"] }) {
  if (status === "reserve") return <Badge tone="accent">Réservé</Badge>;
  if (status === "option") return <Badge tone="warm">À réserver</Badge>;
  return <Badge>Annulé</Badge>;
}
