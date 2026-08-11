import assert from 'node:assert/strict';
import { extractOrderedContentEvents, contentStreamText } from '../src/lib/epub/contentStream.js';

class TextNode {
  constructor(value) {
    this.nodeType = 3;
    this.nodeValue = value;
    this.parentElement = null;
  }
}

class ElementNode {
  constructor(localName, attributes = {}) {
    this.nodeType = 1;
    this.localName = localName;
    this.tagName = localName;
    this.attributes = attributes;
    this.childNodes = [];
    this.children = [];
    this.parentElement = null;
    this.previousElementSibling = null;
    this.hidden = false;
    this.innerHTML = '';
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
}

function add(parent, child) {
  const previous = parent.children[parent.children.length - 1] || null;
  parent.childNodes.push(child);
  child.parentElement = parent;
  if (child.nodeType === 1) {
    child.previousElementSibling = previous;
    parent.children.push(child);
  }
  return child;
}

function text(parent, value) { return add(parent, new TextNode(value)); }
function documentWith(body) { return { body, documentElement: body }; }

const body = new ElementNode('body');
const heading = add(body, new ElementNode('h1', { id: 'chapter-one' }));
text(heading, '第一章');
heading.innerHTML = '第一章';
const paragraph = add(body, new ElementNode('p'));
text(paragraph, '本文');
const ruby = add(paragraph, new ElementNode('ruby'));
text(ruby, '漢字');
const rt = add(ruby, new ElementNode('rt'));
text(rt, 'かんじ');
text(paragraph, '。');
paragraph.innerHTML = '本文<ruby>漢字<rt>かんじ</rt></ruby>。';
const image = add(body, new ElementNode('img', { src: '../Images/illustration.jpg', alt: 'Illustration' }));
const svg = add(body, new ElementNode('svg'));
add(svg, new ElementNode('image', { href: '../Images/title.svg#art' }));

const events = extractOrderedContentEvents(documentWith(body), {
  documentHref: 'OPS/Text/chapter.xhtml',
  spineIndex: 4,
  resolveReference: reference => ({
    documentHref: reference.includes('title') ? 'OPS/Images/title.svg' : 'OPS/Images/illustration.jpg',
    fragmentId: reference.includes('#') ? 'art' : null
  })
});

assert.deepEqual(events.map(event => event.type), ['heading', 'text-block', 'image', 'image']);
assert.equal(events[0].plainText, '第一章');
assert.equal(events[0].headingLevel, 1);
assert.equal(events[1].plainText, '本文漢字。');
assert.equal(events[2].imageHref, 'OPS/Images/illustration.jpg');
assert.equal(events[3].imageHref, 'OPS/Images/title.svg');
assert.equal(events[3].fragmentId, 'art');
assert.equal(contentStreamText(events), '第一章\n本文漢字。');
assert.match(events[0].domPath, /h1:nth-of-type\(1\)/);
assert.equal(events.every(event => event.spineIndex === 4), true);

const uppercaseBody = new ElementNode('BODY');
uppercaseBody.tagName = 'BODY';
uppercaseBody.localName = 'body';
const uppercaseParagraph = add(uppercaseBody, new ElementNode('P'));
uppercaseParagraph.tagName = 'P';
uppercaseParagraph.localName = 'p';
text(uppercaseParagraph, 'HTML paragraph.');
uppercaseParagraph.innerHTML = 'HTML paragraph.';
const uppercaseEvents = extractOrderedContentEvents(documentWith(uppercaseBody));
assert.equal(uppercaseEvents.length, 1);
assert.equal(uppercaseEvents[0].type, 'text-block');

console.log('Phase 13.2A XHTML event normalization tests passed');
