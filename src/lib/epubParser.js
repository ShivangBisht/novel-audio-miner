import JSZip from 'jszip';
import { splitJapaneseSentences } from './japaneseSentenceSplitter.js';
import { loadTokenizer, tokenizeText } from './tokenizer.js';
import { classifyTokens, getDisplayWords, getComprehensionWords, getMiningCandidates } from './wordModel.js';

export async function parseEpubFile(file) {
  // Ensure tokenizer is loaded before parsing
  await loadTokenizer();

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const container = parseXml(await readZipText(zip, 'META-INF/container.xml'));
  const opfPath = container.querySelector('rootfile')?.getAttribute('full-path');
  if (!opfPath) throw new Error('Could not find OPF package file.');
  const opf = parseXml(await readZipText(zip, opfPath));
  const opfDir = dirname(opfPath);
  const manifest = readManifest(opf, opfDir);
  const spine = readSpine(opf, manifest);
  const toc = await readToc(zip, opf, manifest);
  const meta = readMetadata(opf, file.name);

  const rawPages = [];
  for (const item of spine) {
    if (!item?.href || !isHtmlLike(item) || item.properties?.includes('nav')) continue;
    try {
      const html = await readZipText(zip, item.href);
      const page = extractPageWithOrdering(html, item.href, rawPages.length);
      rawPages.push(page);
    } catch (err) { console.warn('[Parser] Skipping spine item:', item.href, err); }
  }

  await fillImageDataUris(rawPages, zip);

  for (const page of rawPages) {
    for (const item of (page.orderedItems || [])) {
      if (item.type === 'sentence' && item.plainText) {
        item.tokens = tokenizeText(item.plainText);
        item.classifiedWords = classifyTokens(item.tokens);
        item.displayWords = getDisplayWords(item.classifiedWords);
        item.comprehensionWords = getComprehensionWords(item.classifiedWords);
        item.miningCandidates = getMiningCandidates(item.classifiedWords);
        item.contentWords = item.displayWords;
      }
    }
  }

  const chapters = buildSectionsFromToc(rawPages, toc);
  const pageChapterMap = new Map();
  chapters.forEach((chapter, ci) => {
    chapter.sourceHrefs.forEach(href => pageChapterMap.set(href, ci));
  });

  const flatItems = [];
  const chapterImageLists = {};
  chapters.forEach((_, ci) => chapterImageLists[ci] = []);

  rawPages.forEach(page => {
    if (looksLikeContentsPage(page, toc)) return;
    const chapterIdx = pageChapterMap.get(page.href) ?? -1;
    const chapter = chapterIdx >= 0 ? chapters[chapterIdx] : null;
    const chapterTitle = chapter?.title || '';

    for (const oi of (page.orderedItems || [])) {
      if (oi.type === 'image') {
        if (!oi.dataUri) continue;
        const imgEntry = { type: 'image', dataUri: oi.dataUri, alt: oi.alt || '', chapterIndex: chapterIdx, chapterTitle, parserDebug: { ...(oi.parserDebug || {}), chapterIndex: chapterIdx, chapterTitle } };
        flatItems.push(imgEntry);
        if (chapterIdx >= 0) chapterImageLists[chapterIdx].push(imgEntry);
      } else {
        flatItems.push({
          type: 'sentence',
          plainText: oi.plainText || '',
          htmlText: oi.htmlText || '',
          chapterIndex: chapterIdx,
          chapterTitle,
          tokens: oi.tokens || [],
          classifiedWords: oi.classifiedWords || [],
          displayWords: oi.displayWords || oi.contentWords || [],
          comprehensionWords: oi.comprehensionWords || oi.contentWords || [],
          miningCandidates: oi.miningCandidates || oi.contentWords || [],
          contentWords: oi.contentWords || [],
          parserDebug: { ...(oi.parserDebug || {}), chapterIndex: chapterIdx, chapterTitle }
        });
      }
    }
  });

  return {
    id: await quickHash(`${file.name}:${file.size}:${file.lastModified}`),
    fileName: file.name,
    title: meta.title || file.name.replace(/\.epub$/i, ''),
    author: meta.creator || '',
    toc,
    chapters,
    flatItems,
    chapterImageLists,
    debug: {
      tocCount: toc.length,
      totalItems: flatItems.length,
      sentenceCount: flatItems.filter(i => i.type === 'sentence').length,
      imageCount: flatItems.filter(i => i.type === 'image').length,
      chapterList: chapters.map((c, i) => ({
        title: c.title,
        sentenceCount: c.sentences.length,
        imageCount: (chapterImageLists[i] || []).length,
        preview: (c.plainText || '').slice(0, 80)
      })),
      pageList: rawPages.map(page => ({ href: page.href, title: page.title, orderedItemCount: (page.orderedItems || []).length, sentenceCount: (page.sentences || []).length, imageCount: (page.images || []).length }))
    }
  };
}

// ─── Rest of the file unchanged (extractPageWithOrdering, fillImageDataUris, helpers) ───

function extractPageWithOrdering(html, href, i) {
  const doc = parseHtml(html);
  const baseDir = dirname(href);
  doc.querySelectorAll('script,style,nav,aside,iframe,object').forEach(e => e.remove());
  const body = doc.body || doc.documentElement;

  const orderedItems = [];
  const allImages = [];
  const allSentences = [];
  const seenZipPaths = new Set();

  function walk(node) {
    if (!node) return;
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      if (src && !src.startsWith('data:')) {
        const zipPath = resolvePath(baseDir, src);
        if (!seenZipPaths.has(zipPath)) {
          seenZipPaths.add(zipPath);
          const alt = node.getAttribute('alt') || node.getAttribute('title') || '';
          allImages.push({ zipPath, alt, sourceHref: href, imageSrc: src });
          orderedItems.push({ type: 'image', zipPath, alt, dataUri: null, parserDebug: { itemType: 'image', pageHref: href, pageIndex: i, orderedIndex: orderedItems.length, imageSrc: src, resolvedZipPath: zipPath, alt, imageExists: null, hasDataUri: false } });
        }
      }
      return;
    }

    const selector = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,div';
    if (node.nodeType === 1 && node.matches && node.matches(selector)) {
      const c = node.cloneNode(true);
      c.querySelectorAll('rt,rp').forEach(n => n.remove());
      const plain = cleanupText(c.textContent || '');
      if (plain && plain.length >= 2) {
        const childBlocks = node.querySelectorAll(selector);
        const childLength = [...childBlocks].filter(x => x !== node)
          .map(x => { const cc = x.cloneNode(true); cc.querySelectorAll('rt,rp').forEach(n => n.remove()); return cleanupText(cc.textContent || '').length; })
          .reduce((a, b) => a + b, 0);
        if (childLength <= plain.length * 0.6) {
          const split = splitJapaneseSentences(plain);
          if (split.length) {
            const hasRuby = !!node.querySelector('ruby,rt');
            const htmlClean = sanitizeReaderHtml(node.innerHTML || '');
            if (split.length === 1 && hasRuby) {
              const sentenceItem = { plainText: split[0], htmlText: htmlClean, parserDebug: { itemType: 'sentence', pageHref: href, pageIndex: i, orderedIndex: orderedItems.length, plainTextLength: split[0].length, htmlTextLength: htmlClean.length, hasRuby: true } };
              allSentences.push(sentenceItem);
              orderedItems.push({ type: 'sentence', ...sentenceItem });
            } else {
              split.forEach(x => {
                const htmlText = escapeHtml(x);
                const s = { plainText: x, htmlText, parserDebug: { itemType: 'sentence', pageHref: href, pageIndex: i, orderedIndex: orderedItems.length, plainTextLength: x.length, htmlTextLength: htmlText.length, hasRuby: false } };
                allSentences.push(s);
                orderedItems.push({ type: 'sentence', ...s });
              });
            }
            return;
          }
        }
      }
    }

    if (node.childNodes) {
      for (const child of node.childNodes) {
        walk(child);
      }
    }
  }

  walk(body);

  if (orderedItems.length === 0) {
    const c = body.cloneNode(true);
    c.querySelectorAll('rt,rp').forEach(n => n.remove());
    const plain = cleanupText(c.textContent || '');
    splitJapaneseSentences(plain).forEach(x => {
      const htmlText = escapeHtml(x);
      const s = { plainText: x, htmlText, parserDebug: { itemType: 'sentence', pageHref: href, pageIndex: i, orderedIndex: orderedItems.length, plainTextLength: x.length, htmlTextLength: htmlText.length, fallback: true } };
      allSentences.push(s);
      orderedItems.push({ type: 'sentence', ...s });
    });
  }

  const title = getPageTitle(doc) || `Page ${i + 1}`;
  const plainText = cleanupText(allSentences.map(s => s.plainText).join('\n'));

  return { id: `page-${i}`, href, title, plainText, sentences: allSentences, images: allImages, orderedItems, parserDebug: { pageIndex: i, href, orderedItemCount: orderedItems.length, sentenceCount: allSentences.length, imageCount: allImages.length } };
}

function buildSectionsFromToc(rawPages, toc) {
  const pageIndexByHref = new Map(rawPages.map((p, i) => [stripFragment(p.href), i]));
  const contentHrefs = new Set(toc.filter(e => isGenericTocTitle(e.title)).map(e => stripFragment(e.href)));
  const tocSections = toc.filter(e => !isGenericTocTitle(e.title)).map(e => ({ ...e, pageIndex: pageIndexByHref.get(stripFragment(e.href)) })).filter(e => Number.isInteger(e.pageIndex)).sort((a, b) => a.pageIndex - b.pageIndex);
  const sections = [];
  const first = tocSections.length ? tocSections[0].pageIndex : 0;
  const prefacePages = rawPages.slice(0, first).filter(p => !contentHrefs.has(stripFragment(p.href)) && !looksLikeContentsPage(p, toc));
  if (prefacePages.some(p => p.sentences.length)) sections.push(combinePages('Preface', prefacePages, 'preface'));
  for (let i = 0; i < tocSections.length; i++) {
    const start = tocSections[i].pageIndex, end = i + 1 < tocSections.length ? tocSections[i + 1].pageIndex : rawPages.length;
    const pages = rawPages.slice(start, end).filter(p => !contentHrefs.has(stripFragment(p.href)) && !looksLikeContentsPage(p, toc));
    if (pages.some(p => p.sentences.length)) sections.push(combinePages(tocSections[i].title, pages, `section-${i}`));
  }
  if (!sections.length) rawPages.forEach((p, i) => { if (!looksLikeContentsPage(p, toc) && p.sentences.length) sections.push(combinePages(p.title || `Section ${i + 1}`, [p], `fallback-${i}`)); });
  return sections.map((s, i) => ({ ...s, id: `chapter-${i}`, index: i }));
}

function combinePages(title, pages, id) {
  const sentences = [], plainParts = [], sourceHrefs = [];
  pages.forEach(page => {
    sourceHrefs.push(page.href);
    if (!page.sentences.length && !page.plainText) return;
    if (page.plainText) plainParts.push(page.plainText);
    page.sentences.forEach(sentence => sentences.push(sentence));
  });
  return { id, href: pages[0]?.href || '', sourceHrefs, title, plainText: cleanupText(plainParts.join('\n')), sentences };
}

function looksLikeContentsPage(page, toc) {
  const title = cleanupText(page.title || ''), href = (page.href || '').toLowerCase(), text = cleanupText(page.plainText || '');
  if (isGenericTocTitle(title)) return true;
  if (/toc|contents?|nav|目次|もくじ|mokuji/i.test(href)) return true;
  if (/^(目次|もくじ|contents|index|table of contents)$/i.test(title)) return true;
  const chapterWords = (text.match(/プロローグ|エピローグ|第[一二三四五六七八九十百〇零0-9]+章|章|【|】|電撃文庫|奥付/g) || []).length;
  const punctuation = (text.match(/[。！？!?]/g) || []).length;
  if (chapterWords >= 4 && punctuation <= 1 && text.length < 900) return true;
  let matches = 0;
  toc.forEach(e => { if (e.title && text.includes(e.title)) matches += 1; });
  return toc.length >= 3 && matches >= Math.min(4, toc.length) && punctuation <= 2;
}

async function fillImageDataUris(pages, zip) {
  for (const page of pages) {
    if (!page.orderedItems) continue;
    for (const item of page.orderedItems) {
      if (item.type === 'image' && item.zipPath && item.dataUri === null) {
        try {
          const imgFile = zip.file(item.zipPath);
          if (item.parserDebug) item.parserDebug.imageExists = Boolean(imgFile);
          if (imgFile) {
            const blob = await imgFile.async('blob');
            item.dataUri = URL.createObjectURL(blob);
            if (item.parserDebug) item.parserDebug.hasDataUri = true;
          }
        } catch (e) { if (item.parserDebug) item.parserDebug.error = e?.message || String(e); }
      }
    }
  }
}

async function readZipText(zip, path) { const f = zip.file(path); if (!f) throw new Error(`Missing file: ${path}`); return f.async('text'); }
function parseXml(t) { return new DOMParser().parseFromString(t, 'application/xml'); }
function parseHtml(t) { return new DOMParser().parseFromString(t, 'text/html'); }
function readMetadata(doc, fallback) { return { title: textOf(doc, 'metadata title') || textOf(doc, 'title') || fallback, creator: textOf(doc, 'metadata creator') || textOf(doc, 'creator') }; }
function readManifest(doc, dir) { const map = new Map(); doc.querySelectorAll('manifest item').forEach(item => { const id = item.getAttribute('id'), href = resolvePath(dir, item.getAttribute('href') || ''); if (id && href) map.set(id, { id, href, mediaType: item.getAttribute('media-type') || '', properties: item.getAttribute('properties') || '' }); }); return map; }
function readSpine(doc, manifest) { return [...doc.querySelectorAll('spine itemref')].map(x => manifest.get(x.getAttribute('idref'))).filter(Boolean); }
async function readToc(zip, opf, manifest) {
  let toc = [];
  const nav = [...manifest.values()].find(i => i.properties?.split(/\s+/).includes('nav')) || [...manifest.values()].find(i => /nav|toc|contents/i.test(i.href) && isHtmlLike(i));
  if (nav) { try { toc = parseNavToc(await readZipText(zip, nav.href), nav.href); } catch {} }
  if (!toc.length) { const id = opf.querySelector('spine')?.getAttribute('toc'); const ncx = id ? manifest.get(id) : [...manifest.values()].find(i => /ncx/i.test(i.mediaType) || /\.ncx$/i.test(i.href)); if (ncx) { try { toc = parseNcxToc(await readZipText(zip, ncx.href), ncx.href); } catch {} } }
  const seen = new Set(); return toc.map((e, i) => ({ ...e, index: i, title: cleanupText(e.title || ''), href: stripFragment(e.href || '') })).filter(e => e.title && e.href).filter(e => { const key = `${e.title}|${e.href}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
function parseNavToc(html, href) { const xml = new DOMParser().parseFromString(html, 'application/xhtml+xml'), doc = xml.querySelector('parsererror') ? parseHtml(html) : xml, navs = [...doc.getElementsByTagName('nav')], nav = navs.find(n => [...n.attributes].some(a => /toc|contents|目次/i.test(a.value))) || navs[0] || doc, base = dirname(href); return [...nav.querySelectorAll('a[href]')].map(a => ({ title: cleanupText(a.textContent || ''), href: resolvePath(base, a.getAttribute('href') || '') })); }
function parseNcxToc(xml, href) { const doc = parseXml(xml), base = dirname(href); return [...doc.getElementsByTagName('navPoint')].map(p => ({ title: cleanupText(p.getElementsByTagName('text')[0]?.textContent || ''), href: resolvePath(base, p.getElementsByTagName('content')[0]?.getAttribute('src') || '') })); }

function isGenericTocTitle(t) { return ['contents', 'content', 'tableofcontents', '目次', 'もくじ'].includes(cleanupText(t).toLowerCase()); }
function getPageTitle(doc) { return cleanupText(doc.querySelector('h1,h2,h3,h4,.title,.chapter-title,[epub\\:type="title"]')?.textContent || ''); }
function textOf(doc, selector) { return cleanupText(doc.querySelector(selector)?.textContent || ''); }
function cleanupText(t) { return (t || '').replace(/\u00a0/g, ' ').replace(/[\t\r\f]+/g, ' ').replace(/\n+/g, '\n').replace(/ {2,}/g, ' ').trim(); }
function dirname(p) { const i = p.lastIndexOf('/'); return i >= 0 ? p.slice(0, i) : ''; }
function stripFragment(p) { return (p || '').split('#')[0]; }
function resolvePath(base, href) { const clean = decodeURIComponent((href || '').split('#')[0]), raw = base ? `${base}/${clean}` : clean, parts = []; raw.split('/').forEach(x => { if (!x || x === '.') return; x === '..' ? parts.pop() : parts.push(x); }); return parts.join('/'); }
function isHtmlLike(i) { return /xhtml|html/i.test(i.mediaType) || /\.(xhtml|html|htm)$/i.test(i.href); }
function sanitizeReaderHtml(html) { const d = document.createElement('div'); d.innerHTML = html; d.querySelectorAll('script,style,nav,aside,iframe,object').forEach(e => e.remove()); d.querySelectorAll('*').forEach(e => [...e.attributes].forEach(a => { const n = a.name.toLowerCase(); if (n.startsWith('on') || n === 'style') e.removeAttribute(a.name); })); return d.innerHTML; }
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
async function quickHash(input) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16); }
