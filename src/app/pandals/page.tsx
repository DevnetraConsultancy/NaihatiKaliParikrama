import type { Metadata } from "next";
import PandalsExplorer from "@/components/PandalsExplorer";

export const metadata: Metadata = {
  title: "Pandal directory",
  description:
    "All Naihati Kali Puja pandals in one list — heritage, large and small, with live distance from you and current crowd level.",
};

export default function PandalsPage() {
  return <PandalsExplorer />;
}
