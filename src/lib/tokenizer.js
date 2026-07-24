/**
 * Japanese tokenizer using kuromoji.js.
 *
 * Responsibility:
 * - Load kuromoji.
 * - Convert Japanese text into raw token objects.
 *
 * App-specific learning classification belongs in wordModel.js, not here.
 */

let tokenizer = null;
let loadingPromise = null;
let scriptLoadingPromise = null;
const SCRIPT_URL='https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.min.js';
const DICT_URL='https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/';
function loadScript(){if(globalThis.window?.kuromoji)return Promise.resolve(window.kuromoji);if(scriptLoadingPromise)return scriptLoadingPromise;if(!globalThis.document)return Promise.reject(new Error('Legacy Kuromoji requires a browser.'));scriptLoadingPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=SCRIPT_URL;script.async=true;script.dataset.namKuromoji='true';script.onload=()=>window.kuromoji?resolve(window.kuromoji):reject(new Error('Kuromoji did not initialize.'));script.onerror=()=>reject(new Error('Could not load Kuromoji legacy runtime.'));document.head.appendChild(script);}).catch(e=>{scriptLoadingPromise=null;throw e;});return scriptLoadingPromise;}

export function loadTokenizer() {
  if (tokenizer) return Promise.resolve(tokenizer);
  if (loadingPromise) return loadingPromise;

  loadingPromise = loadScript().then(kuromoji => new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: DICT_URL }).build((err, tok) => { if (err) return reject(err); tokenizer = tok; resolve(tok); });
  })).catch(error => { loadingPromise = null; throw error; });

  return loadingPromise;
}

/**
 * Tokenize Japanese text.
 *
 * Returns raw token objects with the shape expected by wordModel.js:
 * surface, dictionaryForm, pos, posDetail1, posDetail2, posDetail3, reading.
 */
export function tokenizeText(text) {
  if (!tokenizer) {
    console.warn('[Tokenizer] Tokenizer not loaded, using fallback');
    return fallbackTokenize(text);
  }

  const result = tokenizer.tokenize(text || '');
  return result.map((token) => ({
    surface: token.surface_form,
    dictionaryForm: token.basic_form || token.surface_form,
    pos: token.pos,
    posDetail1: token.pos_detail_1 || '',
    posDetail2: token.pos_detail_2 || '',
    posDetail3: token.pos_detail_3 || '',
    reading: token.reading || ''
  }));
}

function fallbackTokenize(text) {
  const words = [];
  const source = text || '';
  let current = '';

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const isKanji = /[一-鿿]/.test(char);
    const isKana = /[぀-ゟ゠-ヿ]/.test(char);

    if (current.length === 0) {
      current = char;
      continue;
    }

    const previousIsKanji = /[一-鿿]/.test(current[current.length - 1]);
    if (previousIsKanji !== isKanji && !(previousIsKanji && isKana)) {
      words.push(createFallbackToken(current));
      current = char;
    } else {
      current += char;
    }
  }

  if (current) words.push(createFallbackToken(current));
  return words;
}

function createFallbackToken(surface) {
  return {
    surface,
    dictionaryForm: surface,
    pos: '未知',
    posDetail1: '',
    posDetail2: '',
    posDetail3: '',
    reading: ''
  };
}
