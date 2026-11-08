/* eslint-disable react-refresh/only-export-components -- CustomPicker is a HOC */
import type { ComponentType } from "react";
import { CustomPicker, type InjectedColorProps } from "react-color";
import { Alpha, Hue, Saturation } from "react-color/lib/components/common";
import { Pipette } from "lucide-react";

type PointerProps = {
  rgb?: { r: number; g: number; b: number; a?: number };
  hsl?: { h: number };
};

type PartProps = InjectedColorProps & {
  radius: number;
  pointer: ComponentType<PointerProps>;
};

const SaturationField = Saturation as unknown as ComponentType<PartProps>;
const HueBar = Hue as unknown as ComponentType<PartProps>;
const AlphaBar = Alpha as unknown as ComponentType<PartProps>;

const dot =
  "block h-[18px] w-[18px] rounded-full border-[3px] border-[#fff] shadow-[0_0_0_1px_rgb(0_0_0/0.15),0_1px_3px_rgb(0_0_0/0.3)]";

const rgbCss = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `rgb(${r} ${g} ${b})`;

function FieldDot({ rgb }: PointerProps) {
  return (
    <span
      className={`${dot} -translate-x-1/2 -translate-y-1/2`}
      style={{ background: rgb && rgbCss(rgb) }}
    />
  );
}

function HueDot({ hsl }: PointerProps) {
  return (
    <span
      className={`${dot} -translate-x-1/2 translate-y-px`}
      style={{ background: `hsl(${hsl?.h ?? 0} 100% 50%)` }}
    />
  );
}

function AlphaDot({ rgb }: PointerProps) {
  return (
    <span
      className={`${dot} -translate-x-1/2 translate-y-px`}
      style={{ background: rgb && rgbCss(rgb) }}
    />
  );
}

// the browser eyedropper, chromium only for now
type EyeDropperApi = { open: () => Promise<{ sRGBHex: string }> };
type EyeDropperCtor = new () => EyeDropperApi;
const EyeDropper = (globalThis as { EyeDropper?: EyeDropperCtor }).EyeDropper;

function Picker(props: InjectedColorProps) {
  const pick = async () => {
    if (!EyeDropper) return;
    try {
      const { sRGBHex } = await new EyeDropper().open();
      const n = parseInt(sRGBHex.slice(1, 7), 16);
      // keep the current opacity, the dropper only samples the color
      props.onChange?.({
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255,
        a: props.rgb?.a ?? 1,
      });
    } catch {
      // escape cancels the dropper, nothing to do
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="relative h-48 w-full">
        <SaturationField {...props} radius={6} pointer={FieldDot} />
      </div>
      <div className="flex items-center gap-1.5">
        {EyeDropper ? (
          <button
            type="button"
            onClick={pick}
            title="Pick a color from the screen"
            aria-label="Pick a color from the screen"
            className="flex h-[46px] w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-zinc-900 hover:text-ink"
          >
            <Pipette size={18} strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="relative h-5 w-full">
            <HueBar {...props} radius={999} pointer={HueDot} />
          </div>
          <div className="relative h-5 w-full">
            <AlphaBar {...props} radius={999} pointer={AlphaDot} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const StampColorPicker = CustomPicker(Picker);
