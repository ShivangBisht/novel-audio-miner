\# Novel Audio Miner Analyzer Integration Contract



\## Status



Novel Audio Miner is a reader and rendering application.



JP Analyzer is the sole owner of linguistic boundaries, categories, compounds, grammar decisions, headwords and learning eligibility.



\## Novel Audio Miner responsibilities



Novel Audio Miner owns:



\- EPUB parsing

\- sentence and image navigation

\- vertical and horizontal rendering

\- furigana rendering

\- exact analyzer-span rendering

\- known-word database lookup

\- frequency database lookup

\- comprehension aggregation

\- New Words presentation

\- correction-interface presentation

\- Anki mining

\- Nadeshiko and VOICEVOX integration

\- consolidated diagnostic export



\## Prohibited linguistic decisions



Novel Audio Miner must not:



\- merge analyzer spans

\- split analyzer spans

\- construct compound headwords

\- infer grammar points

\- infer numeric expressions

\- infer names

\- decide whether auxiliary material belongs to a predicate

\- use surface searching when authoritative analyzer offsets are available

\- derive learning eligibility from CSS classes



\## Rendering contract



Novel Audio Miner must:



1\. Confirm analyzer text equals the current sentence.

2\. Confirm every span matches the source offsets.

3\. Render the exact supplied range.

4\. Use the analyzer-supplied known-word lookup key.

5\. Use the analyzer-supplied frequency lookup key.

6\. Apply the analyzer-supplied display role.

7\. Fall back to neutral text if analyzer output is invalid.



\## Colour policy



User-specific presentation is resolved as follows:



\- known lexical span: known colour

\- unknown lexical span: supplied frequency policy

\- known numeric lexical span: known colour

\- unknown numeric lexical span: numeric colour

\- function span: muted colour

\- learnable grammar span: grammar colour

\- name span: name colour

\- punctuation span: neutral colour

\- unresolved span: neutral or uncertainty colour



These are presentation mappings, not linguistic reclassification.



\## Transitional Kuromoji status



Kuromoji remains temporary legacy infrastructure while analyzer migration is validated.



No new linguistic features should be added to the Kuromoji pipeline.



Kuromoji will be removed only after analyzer colouring, comprehension, New Words, mining candidates, correction storage and startup reliability are validated.



