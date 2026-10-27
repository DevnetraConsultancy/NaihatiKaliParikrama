import type { Metadata } from "next";
import HelpExplorer from "@/components/HelpExplorer";

export const metadata: Metadata = {
  title: "Help & emergency",
  description:
    "Nearest hospital, police station, public toilet, food stop, pharmacy, parking and emergency helplines around Naihati during Kali Puja.",
};

export default function HelpPage() {
  return <HelpExplorer />;
}
