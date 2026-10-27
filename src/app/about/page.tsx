import type { Metadata } from "next";
import Link from "next/link";
import { InfoIcon, MapIcon, ShieldAlertIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "About this map",
  description:
    "How NaihatiKaliParikrama works: data sources, how crowd levels are calculated, privacy, and how the pandal data can be corrected.",
};

const SAMPLE_DATA = process.env.NEXT_PUBLIC_SAMPLE_DATA === "1";

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-28">
      <h1 className="text-[20px] font-bold text-white">
        NaihatiKaliParikrama{" "}
        <span className="text-[14px] font-normal text-white/50">/ সম্পর্কে · About</span>
      </h1>

      {SAMPLE_DATA ? (
        <div className="mt-3 rounded-2xl border border-gold/30 bg-gold/10 px-3.5 py-3 text-[12.5px] text-white/85">
          <p className="inline-flex items-center gap-1.5 font-semibold text-gold">
            <InfoIcon size={15} />
            <span>Sample data is active</span>
          </p>
          <p className="mt-1 text-white/75">
            যেসব প্যান্ডেলের নাম বা পিন এখনও স্থানীয়ভাবে যাচাই করা হয়নি, সেগুলি এমন ভাবে দেখানো হচ্ছে।
            When <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SAMPLE_DATA</code> is on, unverified
            pins are marked “approximate” so nobody is misled about an exact location.
          </p>
        </div>
      ) : null}

      <section className="glass mt-3 rounded-3xl p-4">
        <h2 className="text-[15px] font-semibold text-white">কী এই অ্যাপ · What this is</h2>
        <p className="bn-text mt-2 text-[12.5px] leading-relaxed text-white/70">
          নৈহাটির কালীপূজার সময় রাস্তার ব্যানারে থাকা কিউআর কোড স্ক্যান করলে এই অ্যাপ খোলে। লোকেশন পারমিশন
          দিলে আপনি দেখতে পাবেন আপনি কোথায় আছেন, সবচেয়ে কাছের প্যান্ডেল কোথায়, হেঁটে যেতে কত সময় লাগবে,
          এলাকায় এখন কত ভিড়, আর কাছে কোথায় হাসপাতাল, থানা, শৌচালয় বা খাবারের দোকান আছে।
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">
          Scan the QR code on the roadside banner during Kali Puja to open this app. Allow location and it
          shows where you are, which pandal is nearest, how long the walk takes, how busy the area is right
          now, and where the closest hospital, police station, toilet or food stop is.
        </p>
      </section>

      <section className="glass mt-3 rounded-3xl p-4">
        <h2 className="text-[15px] font-semibold text-white">
          ভিড়ের হিসাব কীভাবে · How the crowd level works
        </h2>
        <ul className="bn-text mt-2 space-y-1.5 text-[12.5px] text-white/70">
          <li>
            ১. দর্শকরা প্যান্ডেলে দাঁড়িয়ে “এখানে ভিড় কেমন?” বাছেন — সেই রিপোর্ট এক ঘণ্টা ধরে জমা থাকে।
          </li>
          <li>২. কেউ রিপোর্ট না দিলে সময়ভিত্তিক অনুমান দেখানো হয় (রাত ১০টা থেকে ১২টা সবচেয়ে ভিড়)।</li>
          <li>৩. হাঁটার সময় ভিড় অনুযায়ী বাড়ে — ভিড় বেশি হলে একই দূরত্বে বেশি সময় দেখাবে।</li>
          <li>৪. এটি সরকারি হিসাব নয়; বাস্তব পরিস্থিতি আলাদা হতে পারে।</li>
        </ul>
      </section>

      <section className="glass mt-3 rounded-3xl p-4">
        <h2 className="text-[15px] font-semibold text-white">তথ্যের সূত্র · Data sources</h2>
        <ul className="mt-2 space-y-1.5 text-[12.5px] text-white/70">
          <li>
            • <strong>ম্যাপ টাইল / Map tiles:</strong> OpenStreetMap contributors (100% free, no API key)
          </li>
          <li>
            • <strong>রাস্তা ও সময় / Routing &amp; ETA:</strong> OSRM (open source, walking and driving
            profiles)
          </li>
          <li>
            • <strong>হাসপাতাল, থানা, শৌচালয়, খাবার / Facilities:</strong> Neon Postgres &amp; OpenStreetMap
          </li>
          <li>
            • <strong>প্যান্ডেল / Pandals:</strong> maintained in the Neon Postgres database and editable
            from <code className="rounded bg-black/30 px-1">/admin</code>
          </li>
        </ul>
      </section>

      <section className="glass mt-3 rounded-3xl p-4">
        <h2 className="text-[15px] font-semibold text-white">
          গোপনীয়তা · Privacy and location
        </h2>
        <p className="bn-text mt-2 text-[12.5px] leading-relaxed text-white/70">
          আপনার লোকেশন শুধু আপনার ব্রাউজারেই থাকে — সার্ভারে জমা হয় না। ভিড়ের রিপোর্ট করার সময় শুধু একটি
          অজ্ঞাত হ্যাশ রাখা হয় যাতে একই ফোন থেকে বারবার রিপোর্ট না যায়।
        </p>
      </section>

      <section className="glass mt-3 rounded-3xl p-4">
        <h2 className="text-[15px] font-semibold text-white">
          তথ্য ঠিক করা · Correcting the data
        </h2>
        <p className="bn-text mt-2 text-[12.5px] leading-relaxed text-white/70">
          কোনো প্যান্ডেলের নাম, এলাকা বা পিন ভুল থাকলে আয়োজক দল{" "}
          <Link href="/admin" className="text-gold underline">
            /admin
          </Link>{" "}
          পেজ থেকে ঠিক করতে পারেন — ম্যাপে ক্লিক করে সঠিক জায়গা বসানো যায়।
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/map"
            className="liquid-press inline-flex items-center gap-1.5 rounded-2xl bg-gold px-4 py-2.5 text-[13px] font-semibold text-ink"
          >
            <MapIcon size={15} className="stroke-ink" />
            <span>Live Map</span>
          </Link>
          <Link
            href="/help"
            className="liquid-press inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/5 px-4 py-2.5 text-[13px]"
          >
            <ShieldAlertIcon size={15} />
            <span>Emergency Help</span>
          </Link>
        </div>
      </section>

      <p className="mt-4 text-center text-[11px] text-white/35">
        Community-built helper for Naihati&apos;s Kali Puja parikrama.
      </p>
    </div>
  );
}
