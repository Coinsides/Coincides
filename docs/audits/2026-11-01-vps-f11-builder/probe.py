"""F11 Q1/Q3 local probe: same do_parse arguments as the production runner; peak RSS sampled; page-image sizes."""
import io, json, os, threading, time
from pathlib import Path

ROOT = Path(__file__).parent
SAMPLE = Path(r'D:\Coinsides\v12.9-selection\samples\ielts-academic-reading-sample-tasks-2023.pdf')
os.environ.setdefault('MINERU_MODEL_SOURCE', 'local')

import psutil
import pypdfium2 as pdfium
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

proc = psutil.Process()
peak = {'rss': 0}
stop = threading.Event()


def sample():
    while not stop.wait(0.2):
        total = proc.memory_info().rss
        for child in proc.children(recursive=True):
            try:
                total += child.memory_info().rss
            except psutil.Error:
                pass
        peak['rss'] = max(peak['rss'], total)


threading.Thread(target=sample, daemon=True).start()


def math_pdf(path: Path, pages: int):
    styles = getSampleStyleSheet()
    body = styles['BodyText']
    body.fontSize = 11
    body.leading = 16
    flow = []
    for page in range(pages):
        flow.append(Paragraph(f'Section {page + 1}: Consumer theory and marginal analysis', styles['Heading2']))
        for row in range(5):
            flow.append(Paragraph(
                'The consumer maximises U(x,y) = x<super>a</super> y<super>1-a</super> subject to '
                'p<sub>x</sub> x + p<sub>y</sub> y = m, so the first-order condition gives '
                'MU<sub>x</sub> / MU<sub>y</sub> = p<sub>x</sub> / p<sub>y</sub> and demand '
                f'x<super>*</super> = a m / p<sub>x</sub>. Row {row}: the elasticity is '
                'e = (dQ / dP) (P / Q), and total cost C(q) = F + c q<super>2</super>.', body))
            flow.append(Spacer(1, 6))
            flow.append(Paragraph('<i>f(x) = a<sub>0</sub> + a<sub>1</sub> x + a<sub>2</sub> x<super>2</super>'
                                  ' + ... + a<sub>n</sub> x<super>n</super></i>', styles['Italic']))
            flow.append(Spacer(1, 10))
    SimpleDocTemplate(str(path), pagesize=A4).build(flow)


def subset(path: Path, count: int):
    source = pdfium.PdfDocument(str(SAMPLE))
    target = pdfium.PdfDocument.new()
    target.import_pages(source, list(range(min(count, len(source)))))
    target.save(str(path))
    return min(count, len(source))


def parse(label: str, pdf: Path, pages: int, report: list):
    from mineru.cli.common import do_parse, read_fn
    out = ROOT / 'out' / label
    out.mkdir(parents=True, exist_ok=True)
    peak['rss'] = 0
    started = time.perf_counter()
    do_parse(output_dir=str(out), pdf_file_names=[pdf.stem], pdf_bytes_list=[read_fn(pdf)], p_lang_list=['en'],
             backend='pipeline', parse_method='ocr', formula_enable=True, table_enable=True,
             f_draw_layout_bbox=False, f_draw_span_bbox=False, f_dump_md=True, f_dump_middle_json=True,
             f_dump_content_list=True, f_dump_model_output=False, f_dump_orig_pdf=False)
    seconds = time.perf_counter() - started
    time.sleep(0.5)
    content = json.loads(next(out.rglob('*_content_list.json')).read_text(encoding='utf-8'))
    kinds = {}
    for item in content:
        kinds[item.get('type')] = kinds.get(item.get('type'), 0) + 1
    latex = [item.get('text', '')[:120] for item in content if item.get('type') == 'equation'][:3]
    inline = sum(item.get('text', '').count('$') // 2 for item in content if item.get('type') == 'text')
    images = [p.name for p in out.rglob('images/*')]
    entry = dict(label=label, pages=pages, seconds=round(seconds, 2), per_page=round(seconds / pages, 2),
                 peak_rss_gb=round(peak['rss'] / 2 ** 30, 2), kinds=kinds, inline_math=inline, latex_sample=latex,
                 image_files=len(images), output_mb=round(sum(p.stat().st_size for p in out.rglob('*') if p.is_file()) / 2 ** 20, 2))
    report.append(entry)
    print(json.dumps(entry, ensure_ascii=False), flush=True)


def page_images(pdf: Path, pages: int, report: list):
    doc = pdfium.PdfDocument(str(pdf))
    for dpi in (110, 144, 200):
        for fmt, kwargs in (('PNG', {}), ('WEBP', {'quality': 80}), ('JPEG', {'quality': 80})):
            total = 0
            started = time.perf_counter()
            for index in range(pages):
                image = doc[index].render(scale=dpi / 72).to_pil().convert('RGB')
                buffer = io.BytesIO()
                image.save(buffer, fmt, **kwargs)
                total += buffer.tell()
            entry = dict(pdf=pdf.name, dpi=dpi, format=fmt, kb_per_page=round(total / pages / 1024, 1),
                         ms_per_page=round((time.perf_counter() - started) / pages * 1000))
            report.append(entry)
            print(json.dumps(entry), flush=True)


def main():
    report = []
    meta = dict(cpu_logical=psutil.cpu_count(), cpu_physical=psutil.cpu_count(logical=False),
                ram_gb=round(psutil.virtual_memory().total / 2 ** 30, 1))
    import torch
    meta.update(torch_threads=torch.get_num_threads(), cuda=torch.cuda.is_available())
    print(json.dumps(meta), flush=True)
    math5 = ROOT / 'math5.pdf'
    math_pdf(math5, 5)
    math1 = ROOT / 'math1.pdf'
    math_pdf(math1, 1)
    sample5 = ROOT / 'sample5.pdf'
    sample_pages = subset(sample5, 5)
    parse('math1-cold', math1, 1, report)
    parse('math1-warm', math1, 1, report)
    parse('math5-warm', math5, len(pdfium.PdfDocument(str(math5))), report)
    parse('sample5-warm', sample5, sample_pages, report)
    images = []
    page_images(math5, min(3, len(pdfium.PdfDocument(str(math5)))), images)
    page_images(sample5, min(3, sample_pages), images)
    stop.set()
    (ROOT / 'probe-result.json').write_text(json.dumps(dict(meta=meta, parse=report, images=images), indent=1, ensure_ascii=False), encoding='utf-8')
    print('DONE', flush=True)


if __name__ == '__main__':
    main()
