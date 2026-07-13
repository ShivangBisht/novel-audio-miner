export default function FileLoader({ onFile, loading }) {
  function handleChange(event) {
    const file = event.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <section className="upload-card">
      <h2>Load a Japanese EPUB</h2>
      <p>Select an EPUB from your laptop. The file stays local in your browser.</p>

      <label className="file-button">
        {loading ? 'Parsing EPUB...' : 'Choose EPUB'}
        <input
          type="file"
          accept=".epub,application/epub+zip"
          disabled={loading}
          onChange={handleChange}
        />
      </label>

      <p className="small-note">
        Read locally, color known and unknown words, mark known words manually, and mine selected words to Anki.
      </p>
    </section>
  );
}
