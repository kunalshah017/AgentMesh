"use client";

import dynamic from "next/dynamic";
import "./StickerPeel.css";

const StickerPeel = dynamic(() => import("@/components/StickerPeel"), { ssr: false });

interface Sticker {
    src: string;
    width: number;
    rotate?: number;
    /** Position as percentage of page width/height (0-100) */
    position: { xPercent: number; yPercent: number };
}

export function StickerLayer({ stickers }: { stickers: Sticker[] }) {
    return (
        <div className="sticker-layer">
            {stickers.map((s, i) => (
                <StickerPeel
                    key={i}
                    imageSrc={s.src}
                    width={s.width}
                    rotate={s.rotate ?? 0}
                    peelBackHoverPct={20}
                    peelBackActivePct={35}
                    shadowIntensity={0.5}
                    lightingIntensity={0.08}
                    positionPercent={s.position}
                />
            ))}
        </div>
    );
}
