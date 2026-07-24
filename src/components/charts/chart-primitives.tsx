/**
 * Shared chart building blocks. Charts are pure presentation — they take plain
 * data props and never fetch. Every chart pairs its SVG with a `ChartTable`
 * fallback so screen readers get the numbers, not an empty graphic.
 */

export interface ChartPoint {
  /** X-axis label (date, period, category name). */
  label: string;
  value: number;
}

/** Visually-hidden data table mirroring a chart's series, for a11y. */
export function ChartTable({
  caption,
  rows,
  valueLabel = "Value",
  format,
}: {
  caption: string;
  rows: ReadonlyArray<{ label: string; value: number }>;
  valueLabel?: string;
  format?: (value: number) => string;
}) {
  const fmt = format ?? ((value: number) => String(value));
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Label</th>
          <th scope="col">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.label}-${index}`}>
            <th scope="row">{row.label}</th>
            <td>{fmt(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Evenly thinned tick labels so an axis never crowds on a phone. */
export function thinLabels<T>(items: ReadonlyArray<T>, maxTicks = 6): number[] {
  if (items.length <= maxTicks) return items.map((_, index) => index);
  const step = Math.ceil(items.length / maxTicks);
  const indices: number[] = [];
  for (let index = 0; index < items.length; index += step) indices.push(index);
  const last = items.length - 1;
  if (indices[indices.length - 1] !== last) indices.push(last);
  return indices;
}
