"use client";

import dynamic from "next/dynamic";

const Listings = dynamic(() => import("@/pages/Listings"), { ssr: false });

export default function Page() {
  return <Listings />;
}


