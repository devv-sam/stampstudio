import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "../UI/Button";
import { Modal } from "../UI/Modal";
import { useStampEditor } from "../../hooks/useStampEditor";
import { PerforationSlider } from "../UI/PerforationSlider";
import { useDeskMotion } from "../../utils/deskMotion";
import { cropImageToDataUrl } from "../../utils/imageHelpers";

export type AspectChoice = {
  id: string;
  label: string;
  /** undefined = free-form (no constraint). */
  value: number | undefined;
};

const ASPECT_CHOICES: AspectChoice[] = [
  { id: "free", label: "Free", value: undefined },
  { id: "stamp", label: "Match stamp", value: 420 / 300 },
  { id: "square", label: "1:1", value: 1 },
  { id: "wide", label: "16:9", value: 16 / 9 },
];

const MAX_ZOOM = 4;

function ratioBox(ratio: number | undefined) {
  const r = ratio ?? 1;
  return r >= 1
    ? { width: 18, height: Math.round(18 / r) }
    : { width: Math.round(18 * r), height: 18 };
}

export function CropStep({
  src,
  onCancel,
  onConfirm,
  confirmDisabled = false,
  confirmLabel = "Continue",
  round = false,
}: {
  src: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string, width: number, height: number) => void;
  /** Combined with cropping state — e.g. while parent persists the asset */
  confirmDisabled?: boolean;
  confirmLabel?: string;
  /** circular 1:1 frame, used by the disc designer */
  round?: boolean;
}) {
  const { springy } = useDeskMotion();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  // remounts the uncontrolled slider when scroll or pinch zooms the cropper
  const [zoomSyncKey, setZoomSyncKey] = useState(0);
  const [aspect, setAspect] = useState<AspectChoice>(ASPECT_CHOICES[1]);
  const { stampDimensions } = useStampEditor();
  const cropperRef = useRef<Cropper>(null);
  const [pixelArea, setPixelArea] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setPixelArea(areaPixels);
  }, []);

  const onApply = async () => {
    if (!pixelArea) return;
    setIsCropping(true);
    try {
      const result = await cropImageToDataUrl(src, pixelArea);
      onConfirm(result.dataUrl, result.width, result.height);
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      labelledBy="crop-step-title"
      // the cropper measures itself while the modal is still scaled down
      onSettled={() => cropperRef.current?.computeSizes()}
    >
      <div className="flex flex-col gap-1.5 p-1.5">
        <h2 id="crop-step-title" className="px-2 py-1 text-lg font-semibold">
          Crop & adjust
        </h2>

        <div className="relative h-[360px] w-full overflow-hidden rounded-xl bg-desk max-md:h-[280px]">
          <Cropper
            ref={cropperRef}
            image={src}
            crop={crop}
            zoom={zoom}
            maxZoom={MAX_ZOOM}
            cropShape={round ? "round" : "rect"}
            aspect={
              round
                ? 1
                : aspect.id === "stamp"
                ? stampDimensions.width / stampDimensions.height
                : aspect.value
            }
            onCropChange={setCrop}
            onZoomChange={(next) => {
              setZoom(next);
              setZoomSyncKey((k) => k + 1);
            }}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid={!round}
            style={{
              cropAreaStyle: {
                color: "rgb(241 241 241 / 0.82)",
                border: "2px solid var(--color-cornflower)",
              },
            }}
          />
        </div>

        {round ? null : (
          <div
            role="radiogroup"
            aria-label="Aspect ratio"
            className="flex flex-wrap gap-0.5 rounded-xl bg-zinc-900 p-0.5"
          >
            {ASPECT_CHOICES.map((choice) => {
              const active = aspect.id === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAspect(choice)}
                  className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm whitespace-nowrap"
                >
                  {active ? (
                    <motion.span
                      layoutId="crop-aspect-pill"
                      transition={springy}
                      className="absolute inset-0 rounded-lg bg-card shadow-sm"
                    />
                  ) : null}
                  <motion.span
                    aria-hidden
                    initial={false}
                    animate={ratioBox(choice.value)}
                    transition={springy}
                    className={`relative rounded-[3px] border-[1.5px] ${
                      active ? "border-cornflower" : "border-zinc-500"
                    } ${choice.value ? "" : "border-dashed"}`}
                  />
                  <span className="relative">{choice.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <PerforationSlider
          key={zoomSyncKey}
          label="Zoom"
          defaultValue={Math.round(zoom * 100)}
          minValue={100}
          maxValue={MAX_ZOOM * 100}
          format={(v) => `${v}%`}
          onInput={(v) => setZoom(v / 100)}
        />

        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            onClick={onApply}
            disabled={!pixelArea || isCropping || confirmDisabled}
          >
            {isCropping ? "Cropping…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
