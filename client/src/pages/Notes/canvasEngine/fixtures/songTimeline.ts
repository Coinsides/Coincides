import type { KnownTimelineComponentPayload } from '../componentBlockService';

/** B2 self-authored positive specimen: thirteen entries covering the founding decades. */
export const SONG_TIMELINE: KnownTimelineComponentPayload = {
  component_kind: 'timeline',
  params: {
    title: '宋初年表 · 960—997',
    entries: [
      { year: '960', label: '陈桥兵变，北宋建立', detail: '赵匡胤即位，以开封为都，改国号为宋。' },
      { year: '961', label: '收束禁军兵权', detail: '宋初逐步调整禁军将领与统兵制度，强化皇帝对军队的控制。' },
      { year: '963', label: '荆南与湖南归宋', detail: '宋军南下，取得荆南、湖南地区，推进统一。' },
      { year: '965', label: '后蜀灭亡', detail: '宋军入成都，四川纳入宋的版图。' },
      { year: '968', label: '开宝改元', detail: '太祖后期继续整顿财政与地方行政，为南征积累资源。' },
      { year: '971', label: '南汉灭亡', detail: '宋军攻取广州，岭南地区归宋。' },
      { year: '974', label: '征南唐', detail: '宋军沿江进兵，向江南腹地展开攻势。' },
      { year: '975', label: '南唐灭亡', detail: '金陵陷落，李煜降宋，江南统一取得关键进展。' },
      { year: '976', label: '太宗即位', detail: '太祖去世，赵光义继位，改元太平兴国。' },
      { year: '978', label: '吴越纳土', detail: '钱俶献地归宋；泉漳地区也归入宋朝。' },
      { year: '979', label: '北汉灭亡', detail: '宋军取太原，结束北汉政权；随后北伐在高梁河受挫。' },
      { year: '986', label: '雍熙北伐', detail: '宋军分路北进，战事失利后转入更持久的边防经营。' },
      { year: '997', label: '真宗即位', detail: '太宗去世，赵恒继位，宋初制度建设进入新的阶段。' },
    ],
  },
};
