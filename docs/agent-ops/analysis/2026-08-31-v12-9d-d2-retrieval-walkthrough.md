> **状态 (Status)**: frozen
> **层 (Layer)**: 分析 / Analysis（真实检索走查收据）
> **日期 (Updated)**: 2026-08-31
> **权威 (Authoritative)**: 否；字段与数字为本次开发库及真实 query 嵌入输出快照

# V12.9d d-2 检索走查报告

## 结论

从 `server` 目录按工单指定命令执行 3 条英文短 query，三次均 exit 0；每次
调用一次 `dashscope:text-embedding-v4:1024` query 嵌入，并经
`searchImprintFragmentVectors` KNN、用户归属过滤及
`getImprintFragmentsByAnchor` exact 锚水合返回 top-3。9 条结果均带完整
`fragment / imprint / source_file / retrieval` 四组出处链。

凭证只申报 `present=true / length=116`，本报告及走查输出均未包含 key 值或片段。

## K-4 · 调用与字符预算

| # | query 原文 | API 调用 | 输入字符 | top-k 返回 |
|---:|---|---:|---:|---:|
| 1 | `academic reading passage about climate and scientific research` | 1 | 62 | 3 |
| 2 | `IELTS writing task about charts and population change` | 1 | 53 | 3 |
| 3 | `listening test conversation about university study` | 1 | 50 | 3 |
| **合计** | — | **3** | **165** | **9** |

实际重试 0 次。硬上限为 10 次 API 调用 / 5,000 输入字符；本次未触发上限。

## Query 1 · academic reading passage about climate and scientific research

### Top 1

```json
{
  "fragment": {
    "id": "e5dc4939-91d2-4120-a960-7dc049c7e6b4",
    "seq": 20,
    "role": "para",
    "text": "Page 21 of 46 \tIELTS.org\nQuestions 1 – 3\nComplete each sentence with the correct ending, A-F, below. Write the correct letter, A-F, in boxes\n1-3 on your answer sheet.\n1 \tHarkness’s research method was different to that of other writers because\n2 \tHarkness’s reconstruction of the 16th-century London scientific groups was new because\n3 \tHarkness shows that the 16th-century London scientists were innovative because\nA \tshe has the greatest knowledge of Elizabethan London.\nB \tshe started by seeking to understand how basic terms were used in the past.\nC \tthey worked as individuals rather than as a group.\nD \tshe examined how their methods evolved and changed.\nE \tClement Draper was the best scientist of his time.\nF \tthey used old ways of analysing written information for new purposes.",
    "anchor": { "family": "page", "page": 21, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "d5247f8f-a4ff-4dce-8273-c62d4114425c",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "3e0cd18f-265f-4038-9f5c-fc99d3a3c8b3",
    "original_filename": "ielts-academic-reading-sample-tasks-2023.pdf",
    "content_hash": "61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.5938219428062439,
    "anchor_match_count": 1
  }
}
```

### Top 2

```json
{
  "fragment": {
    "id": "a8e97213-ac2c-469f-a98e-4ff41538ba97",
    "seq": 42,
    "role": "para",
    "text": "Page 43 of 46 \tIELTS.org\nAcademic Reading Sample Task – Summary\nCompletion: selecting words from the text (Answers)\n1 \tfrustration\n2 \tfirst-time user\n3 \tessential\n4 \tspecial knowledge\n5 \tlegal formulations",
    "anchor": { "family": "page", "page": 43, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "d5247f8f-a4ff-4dce-8273-c62d4114425c",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "3e0cd18f-265f-4038-9f5c-fc99d3a3c8b3",
    "original_filename": "ielts-academic-reading-sample-tasks-2023.pdf",
    "content_hash": "61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.617336094379425,
    "anchor_match_count": 1
  }
}
```

### Top 3

```json
{
  "fragment": {
    "id": "92caeda9-892d-4afe-85d4-09e662e7383f",
    "seq": 21,
    "role": "para",
    "text": "Page 22 of 46 \tIELTS.org\nAcademic Reading Sample Task – Matching Sentence\nEndings (Answers)\n1 \tB ■ she started by seeking to understand how basic terms were used in the past\n2 \tD ■ she examined how their methods evolved and changed\n3 \tF ■ they used old ways of analysing written information for new purposes",
    "anchor": { "family": "page", "page": 22, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "d5247f8f-a4ff-4dce-8273-c62d4114425c",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "3e0cd18f-265f-4038-9f5c-fc99d3a3c8b3",
    "original_filename": "ielts-academic-reading-sample-tasks-2023.pdf",
    "content_hash": "61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.6217875480651855,
    "anchor_match_count": 1
  }
}
```

## Query 2 · IELTS writing task about charts and population change

### Top 1

```json
{
  "fragment": {
    "id": "cc1502de-440d-4f1e-9b19-3bcbd5a9463c",
    "seq": 1,
    "role": "para",
    "text": "Sample Academic Writing Part 1\nCandidate Response 1\nThe chart gives you information on how children travelled to and from school in the years\n1990 and 2010. The modes of transport were by car, walking, cycling, walking and by bus\nand by bus only.\nA striking feature in this chart is that the number of children who travelled by car has\nincreased from 1990 to 2010. In 1990 the most number of trips per year by children were by\nwalking. However in 2010 it reduced to up to 6 million trips per year. The total number of\ntrips to school by cycling and walking and bus were approximately 6 million in 1990.\nHowever the number of trips to school by cycling reduced to 2 million and the number of trips\nto school by walking and bus reduced to about 3 million in 2010. There isn’t a significant\nchange to the number of trips to school by bus. In 1990 it was about 7 million and in 2010 it\ncame down to approximately 5 million.\nIn 1990 the amount of children who travelled to and from school by car was significantly\nlower than the children who travelled by walking. In contrast in 2010 the number of children\nwho travelled to school by car increased and the number of children walking to school has\ndecreased. In 2010 children travelled to school by bus more than they cycled to school.\nExaminer comment\nBand 6\nThe key features which are selected are covered and clearly highlighted, but reporting is somewhat\nmechanical and data is provided to support only some of the descriptions. There is a relevant\noverview in the final paragraph, with a summary of the main changes. Information and ideas are\ngenerally arranged coherently, though there is some repetition [number of trips]. Cohesive devices are\nused effectively and there is a clear progression overall.\nThe range of vocabulary is sufficient to allow some flexibility, with some less common items. For a\nhigher band, a wider range of vocabulary could be used, within the scope of the task. There is a mix of\nsimple and complex sentence structures, used fairly accurately, but again, there is not a wide enough\nvariety of structures to achieve a higher band.",
    "anchor": { "family": "page", "page": 2, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "d238deb2-e80d-4378-b693-40f1f4c90c71",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "51169d5b-896a-4e2a-a373-e7e9898232b6",
    "original_filename": "ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf",
    "content_hash": "cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.3971458971500397,
    "anchor_match_count": 1
  }
}
```

### Top 2

```json
{
  "fragment": {
    "id": "3bc81b6f-d8c8-4e93-9007-bbda7f8d99ba",
    "seq": 2,
    "role": "para",
    "text": "Page 3 of 26 IELTS.org\nAcademic Writing Sample Task – 1A\nWRITING TASK 1\nYou should spend about 20 minutes on this task.\nWrite at least 150 words.\nThe chart below shows the number of men and women in further education in\nBritain in three periods and whether they were studying full-time or part-time.\nSummarise the information by selecting and reporting the main features, and\nmake comparisons where relevant.",
    "anchor": { "family": "page", "page": 3, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "b5df948c-d1c1-4448-a32d-b18ecadbf31e",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "b4ee4db8-ba5c-46a3-b714-2f9a66ce4cdf",
    "original_filename": "ielts-academic-writing-sample-tasks-2023.pdf",
    "content_hash": "f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.4147256910800934,
    "anchor_match_count": 1
  }
}
```

### Top 3

```json
{
  "fragment": {
    "id": "1de3e289-9f8b-4f30-8f96-2d41a5dafeab",
    "seq": 3,
    "role": "para",
    "text": "Page 4 of 26 IELTS.org\nAcademic Writing Sample Task – 1B\nWRITING TASK 1\nYou should spend about 20 minutes on this task.\nWrite at least 150 words.\nThe graph below shows radio and television audiences throughout the day in 1992.\nSummarise the information by selecting and reporting the main features, and make\ncomparisons where relevant.",
    "anchor": { "family": "page", "page": 4, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "b5df948c-d1c1-4448-a32d-b18ecadbf31e",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "b4ee4db8-ba5c-46a3-b714-2f9a66ce4cdf",
    "original_filename": "ielts-academic-writing-sample-tasks-2023.pdf",
    "content_hash": "f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.5067237615585327,
    "anchor_match_count": 1
  }
}
```

## Query 3 · listening test conversation about university study

### Top 1

```json
{
  "fragment": {
    "id": "82c216f2-69f1-4f31-89d9-28895e85accd",
    "seq": 13,
    "role": "para",
    "text": "Page 14 of 33 IELTS.org\nListening Sample Task – Sentence Completion\nPART 3\nQuestions 27 – 30\nComplete the sentences below.\nWrite NO MORE THAN TWO WORDS for each answer.\nStudying with the Open University demanded a great deal of 27 …………………… .\nStudying and working at the same time improved Rachel’s 28 …………………… skills.\nIt was helpful that the course was structured in 29 …………………… .\nShe enjoyed meeting other students at 30 …………………… .",
    "anchor": { "family": "page", "page": 14, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "1d1d8c63-f7ab-459c-a871-cfdf9739a89a",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "3c5bc81c-16eb-4407-8bcc-755997bc3ff0",
    "original_filename": "ielts-listening-sample-tasks-2023.pdf",
    "content_hash": "1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.4816698133945465,
    "anchor_match_count": 1
  }
}
```

### Top 2

```json
{
  "fragment": {
    "id": "8b93d929-8945-4452-b5a3-cdf525362426",
    "seq": 17,
    "role": "para",
    "text": "Page 18 of 33 IELTS.org\nListening Sample Task – Matching 1\nPART 3\nQuestions 21 – 25\nWhat does Jack tell his tutor about each of the following course options?\nA He'll definitely do it.\nB He may or may not do it.\nC He won't do it.\nWrite the correct letter, A, B or C, next to questions 21- 25.\nYou may choose any letter more than once.\n21 Media Studies\n22 Women and Power\n23 Culture and Society\n24 Identity and Popular Culture\n25 Introduction to Cultural Theory",
    "anchor": { "family": "page", "page": 18, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "1d1d8c63-f7ab-459c-a871-cfdf9739a89a",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "3c5bc81c-16eb-4407-8bcc-755997bc3ff0",
    "original_filename": "ielts-listening-sample-tasks-2023.pdf",
    "content_hash": "1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.5085262060165405,
    "anchor_match_count": 1
  }
}
```

### Top 3

```json
{
  "fragment": {
    "id": "2f6419d5-ea1c-4517-a8d0-d04b123a9321",
    "seq": 14,
    "role": "para",
    "text": "Page 15 of 33 IELTS.org\nListening Sample Task – Sentence Completion\n(Recording and Tapescript)\nLink to Recording\nTapescript\nTwo friends, Rachel and Paul, are discussing studying with the Open University. Rachel has\nalready done a course at the university, but Paul has not. The extract relating to these\nquestions comes from the last part of the recording.\nPaul The other thing I wanted to ask you was, did you find it hard, studying\nwith the Open University?\nRachel You mean, because you’re studying on your own, most of the time?\nPaul Mm.\nRachel Well it took me a while to get used to it. I found I needed to maintain a\nhigh level of motivation, because it’s so different from school. There’s no-\none saying, ‘Why haven’t you written your assignment yet?' and that sort\nof thing.\nPaul Oh dear.\nRachel You’ll learn it, Paul. Another thing was that I got very good at time-\nmanagement because I had to fit time for studying round a full-time job.\nPaul Well I’m hoping to change to working part-time, so that’ll help.\nRachel What makes it easier is that the degree is made up of modules, so you can\ntake time off between them if you need to. It isn’t like a traditional three-\nor four-year course, where you’ve got to do the whole thing of it in one go.\nPaul That’s good, because I’d like to spend six months travelling next year.\nRachel Huh, it’s all right for some. Then even though you’re mostly studying at\nhome, remember you’ve got tutors to help you, and from time to time\nthere are summer schools. They usually last a week. They’re great,\nbecause you meet all the other people struggling with the same things as\nyou. I’ve made some really good friends that way.",
    "anchor": { "family": "page", "page": 15, "block_index": 1 },
    "lang": null
  },
  "imprint": {
    "id": "1d1d8c63-f7ab-459c-a871-cfdf9739a89a",
    "transcriber_name": "native-pdf",
    "transcriber_version": "2.4.5",
    "transcriber_lockfile_hash": "891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95",
    "anchor_fidelity": "page",
    "text_normalization": "whitespace"
  },
  "source_file": {
    "id": "3c5bc81c-16eb-4407-8bcc-755997bc3ff0",
    "original_filename": "ielts-listening-sample-tasks-2023.pdf",
    "content_hash": "1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e"
  },
  "retrieval": {
    "model_id": "dashscope:text-embedding-v4:1024",
    "distance": 0.5119985342025757,
    "anchor_match_count": 1
  }
}
```

## K-5 · 粒度边界

**「本轮检索质量只代表 page 级地板上的检索质量,⛔ 不代表本产品的检索质量。」**

同四卷 MinerU 侧 808 碎片，本代 110 碎片，粒度比 7.35 倍；本代 role
分布为 `para` 110 / `heading` 0。因此本报告只证明检索与经锚水合管线可用，
不把 page 级结果质量冒充产品最终检索质量。

## K-6 · 本单没有做

- UI：未做。
- 识别器引用模式与引用校验闸：未做；这是 c-3 的主体，门开后另单施工。
- FTS 半边：未做。
- 粒度升级：未做；切 MinerU 默认路径永远是独立显式工单。
- 嵌入模型终选：未做，延至 V14。
- HTTP 全链路端到端测试：未做；本次走查走 in-process 服务路径，路由仅为薄壳。
- 跨库语境：未做，延至 V14。
