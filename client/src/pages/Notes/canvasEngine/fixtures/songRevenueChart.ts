import type { KnownChartComponentPayload } from '../componentBlockService';

/** B2 self-authored equivalent teaching dataset, not a historical revenue citation. */
export const SONG_REVENUE_CHART: KnownChartComponentPayload = {
  component_kind: 'chart_bar',
  params: {
    title: '岁入的换血',
    y_label: '财政收入（教学示意单位）',
    x_labels: ['宋初', '北宋中期', '北宋后期'],
    series: [
      { name: '农业税收入', values: [70, 60, 50] },
      { name: '工商与专卖收入', values: [30, 65, 100] },
    ],
  },
};
