import type { Metadata } from "next";
import MapExperience from "@/components/map/MapExperience";

export const metadata: Metadata = {
  title: "Live pandal map",
  description:
    "Live Naihati Kali Puja pandal map with your position, the next pandal, walking routes, travel time, live crowd levels and nearby hospitals, police stations and toilets.",
};

/** The QR-code destination: a full-screen live map. */
export default function MapPage() {
  return <MapExperience />;
}
