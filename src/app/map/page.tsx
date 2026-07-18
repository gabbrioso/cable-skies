import { CableMap } from "@/components/map/CableMap";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ photo?: string; contribute?: string }>;
}) {
  const params = await searchParams;
  return (
    <CableMap
      initialPhotoId={params.photo ?? null}
      openContribute={params.contribute === "1"}
    />
  );
}
