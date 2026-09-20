import { useId, type CSSProperties } from 'react';
import type { NoteBlock } from '../runtimeDataTypes';
import {
  isChartComponentPayload, isTimelineComponentPayload, readComponentBlockPayload,
  type ChartComponentParams,
} from '../componentBlockService';
import styles from './ComponentBlockProjection.module.css';

const seriesClasses = [styles.series0, styles.series1, styles.series2, styles.series3];
const numberLabel = (value: number) => value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) >= 1e6)
  ? value.toExponential(2) : new Intl.NumberFormat('en', { maximumFractionDigits: 6 }).format(value);

function axisLabelLines(label: string, width: number): string[] {
  const capacity = Math.max(4, Math.floor((width - 12) / 7));
  const lines = ['']; let used = 0;
  for (const character of Array.from(label.replace(/\r\n?/g, '\n'))) {
    const size = character.codePointAt(0)! > 255 ? 1.7 : 1;
    if (character === '\n' || used + size > capacity) {
      if (lines.length === 3) { lines[2] = `${lines[2].slice(0, -1)}…`; break; }
      lines.push(''); used = 0;
      if (character === '\n') continue;
    }
    lines[lines.length - 1] += character; used += size;
  }
  return lines;
}

/** Both built-in charts use this axis; normalization keeps all finite domain values drawable. */
function Chart({ params, kind }: { params: ChartComponentParams; kind: 'chart_bar' | 'chart_line' }) {
  const descriptionId = useId();
  const values = params.series.flatMap((series) => series.values);
  const magnitude = Math.max(...values.map(Math.abs)) || 1;
  const low = Math.min(0, ...values.map((value) => value / magnitude));
  const high = Math.max(0, ...values.map((value) => value / magnitude)) || (low === 0 ? 1 : 0);
  const span = high - low;
  const width = Math.max(560, params.x_labels.length * Math.max(90, params.series.length * 64) + 84);
  const left = 72; const right = width - 24; const top = 32; const bottom = 256;
  const y = (normalized: number) => bottom - ((normalized - low) / span) * (bottom - top);
  const step = (right - left) / params.x_labels.length;
  const x = (index: number) => left + step * (index + 0.5);
  const zero = y(0);
  const barWidth = Math.min(56, step * 0.8 / params.series.length);
  const ticks = Array.from({ length: 5 }, (_, index) => low + span * index / 4);

  return <>
    {params.y_label && <p className={styles.axisLabel}>{params.y_label}</p>}
    <div className={styles.chartViewport} tabIndex={0} role="region" aria-label="Chart — scroll horizontally for more data">
      <svg className={styles.chart} width={width} height={360} viewBox={`0 0 ${width} 360`}
        role="img" aria-label={params.title || (kind === 'chart_bar' ? 'Bar chart' : 'Line chart')} aria-describedby={descriptionId}>
        <desc id={descriptionId}>{params.series.map((series) => `${series.name}: ${params.x_labels.map((label, index) => `${label} ${series.values[index]}`).join('; ')}`).join('. ')}</desc>
        <g data-chart-axis="true" className={styles.axis}>
          {ticks.map((tick, index) => <g key={index}>
            <line className={styles.gridline} x1={left} x2={right} y1={y(tick)} y2={y(tick)} />
            <text x={left - 10} y={y(tick) + 4} textAnchor="end">{numberLabel(tick * magnitude)}</text>
          </g>)}
          <line x1={left} x2={left} y1={top} y2={bottom} />
          <line x1={left} x2={right} y1={zero} y2={zero} data-chart-baseline="true" />
          {params.x_labels.map((label, index) => <g key={index}>
            <line x1={x(index)} x2={x(index)} y1={bottom} y2={bottom + 5} />
            <text x={x(index)} y={bottom + 42} textAnchor="middle" data-chart-x-label={index}><title>{label}</title>
              {axisLabelLines(label, step).map((line, lineIndex) => <tspan key={lineIndex} x={x(index)} dy={lineIndex === 0 ? 0 : 16}>{line}</tspan>)}
            </text>
          </g>)}
        </g>
        {params.series.map((series, seriesIndex) => <g key={seriesIndex} className={seriesClasses[seriesIndex]} data-chart-series={series.name}>
          {kind === 'chart_line' && <polyline className={styles.line} points={series.values.map((value, index) => `${x(index)},${y(value / magnitude)}`).join(' ')} />}
          {series.values.map((value, index) => {
            const valueY = y(value / magnitude);
            const valueX = kind === 'chart_bar' ? x(index) + (seriesIndex - (params.series.length - 1) / 2) * barWidth : x(index);
            const labelX = kind === 'chart_line' ? x(index) + (seriesIndex - (params.series.length - 1) / 2) * Math.min(60, step * 0.8 / params.series.length) : valueX;
            return <g key={index} data-chart-value={value}>
              {kind === 'chart_bar'
                ? <rect className={styles.bar} x={valueX - barWidth * 0.44} y={Math.min(zero, valueY)} width={barWidth * 0.88} height={Math.abs(valueY - zero)} />
                : <circle className={styles.point} cx={valueX} cy={valueY} r={3.5} />}
              <text className={styles.value} x={labelX} y={valueY + (value < 0 ? 16 : -8)} textAnchor="middle">{numberLabel(value)}</text>
            </g>;
          })}
        </g>)}
      </svg>
    </div>
    <ul className={styles.legend} aria-label="Chart legend">{params.series.map((series, index) =>
      <li key={index} className={seriesClasses[index]}><span className={styles.swatch} aria-hidden="true" />{series.name}</li>)}</ul>
  </>;
}

export function ComponentBlockProjection({ block, print = false, style }: {
  block: Pick<NoteBlock, 'block_type' | 'content_json'>;
  print?: boolean;
  style?: CSSProperties;
}) {
  const payload = readComponentBlockPayload(block);
  if (!payload) return <div role="status" className={styles.invalid}>Component content could not be read.</div>;
  return <div className={`${styles.component} ${print ? styles.print : ''}`} style={style}
    data-component-block="true" data-component-kind={payload.component_kind}>
    {isTimelineComponentPayload(payload) ? <>
      {payload.params.title && <h3 className={styles.title}>{payload.params.title}</h3>}
      <ol className={styles.timeline} aria-label={payload.params.title || 'Timeline'}>
        {payload.params.entries.map((entry, index) => <li key={index}>
          <span className={styles.year}>{entry.year}</span>
          {entry.detail ? <details className={styles.entry}>
            <summary>{entry.label}</summary><p>{entry.detail}</p>
          </details> : <span className={styles.entryLabel}>{entry.label}</span>}
        </li>)}
      </ol>
    </> : isChartComponentPayload(payload) ? <>
      {payload.params.title && <h3 className={styles.title}>{payload.params.title}</h3>}
      <Chart params={payload.params} kind={payload.component_kind} />
    </> : <p className={styles.unknown} role="status"><strong>{payload.component_kind}</strong><span>未注册组件</span></p>}
  </div>;
}
