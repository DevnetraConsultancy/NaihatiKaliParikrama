import type { Metadata } from "next";
import PlanBuilder from "@/components/PlanBuilder";

export const metadata: Metadata = {
  title: "Parikrama planner",
  description:
    "Plan your Naihati Kali Puja pandal-hopping route: pick pandals, get the best walking order, total distance and walking time.",
};

export default function PlanPage() {
  return <PlanBuilder />;
}
