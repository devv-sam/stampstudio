/* eslint-disable react-refresh/only-export-components -- CustomPicker is a HOC */
import type { ComponentType } from "react";
import { CustomPicker, type InjectedColorProps } from "react-color";
import { Alpha, Hue, Saturation } from "react-color/lib/components/common";

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

function Picker(props: InjectedColorProps) {
  return (
    <div className="space-y-1.5">
      <div className="relative h-48 w-full">
        <SaturationField {...props} radius={6} pointer={FieldDot} />
      </div>
      <div className="relative h-5 w-full">
        <HueBar {...props} radius={999} pointer={HueDot} />
      </div>
      <div className="relative h-5 w-full">
        <AlphaBar {...props} radius={999} pointer={AlphaDot} />
      </div>
    </div>
  );
}

export const StampColorPicker = CustomPicker(Picker);
