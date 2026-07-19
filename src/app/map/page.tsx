import { Suspense } from "react";
import { CableMap } from "@/components/map/CableMap";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string; contribute?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense
      fallback={<div className="map-shell map-shell--void map-loading">Loading map…</div>}
    >
      <CableMap
        initialPhotoId={params.photo ?? null}
        openContribute={params.contribute === "1"}
      />
    </Suspense>
  );
}
