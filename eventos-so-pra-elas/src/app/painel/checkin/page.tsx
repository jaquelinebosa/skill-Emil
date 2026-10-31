import type { Metadata } from "next";
import { requireStaff } from "@/lib/staff";
import { getLatestEvent } from "@/lib/data";
import Nav from "../Nav";
import CheckIn from "./CheckIn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Check-in", robots: { index: false } };

export default async function CheckInPage() {
  const staff = await requireStaff();
  const ev = await getLatestEvent();
  return (
    <main className="page">
      <Nav staff={staff} current="checkin" eventName={ev?.name} />
      <CheckIn />
    </main>
  );
}
