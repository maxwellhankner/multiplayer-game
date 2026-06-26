import type { CSSProperties } from 'react';
import { PLAYER_COLORS } from '../../shared/constants';

interface ColorPickerProps {
  takenColors: ReadonlySet<string>;
  selected: string | null;
  onSelect: (color: string) => void;
}

export default function ColorPicker({ takenColors, selected, onSelect }: ColorPickerProps) {
  return (
    <div className="color-picker">
      <p className="color-picker-label">Pick your color</p>
      <div className="color-picker-grid" role="listbox" aria-label="Player color">
        {PLAYER_COLORS.map((color) => {
          const taken = takenColors.has(color);
          const isSelected = selected === color;
          return (
            <button
              key={color}
              type="button"
              role="option"
              aria-selected={isSelected}
              aria-disabled={taken}
              className={`color-swatch${isSelected ? ' selected' : ''}${taken ? ' taken' : ''}`}
              style={{ '--swatch-color': color } as CSSProperties}
              disabled={taken}
              onClick={() => onSelect(color)}
              title={taken ? 'Color taken' : 'Select color'}
            />
          );
        })}
      </div>
    </div>
  );
}
