import { useState } from 'react';
import FileLoader from './components/FileLoader.jsx';
import ApplicationStatusIndicator from './components/ApplicationStatusIndicator.jsx';
import Reader from './components/Reader.jsx';
import { parseEpubFile } from './lib/epubParser.js';

export default function App() {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file) {
    setError('');
    setLoading(true);

    try {
      const parsedBook = await parseEpubFile(file);
      setBook(parsedBook);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to parse EPUB.');
    } finally {
      setLoading(false);
    }
  }

  function handleLoadAnotherBook() {
    setBook(null);
    setError('');
  }

  return (
    <div className={`app-shell ${book ? 'reader-active' : 'startup-active'}`}>
      <div className={book ? 'application-status-slot reader-status-slot' : 'application-status-slot startup-status-slot'}>
        <ApplicationStatusIndicator />
      </div>
      {!book && <FileLoader onFile={handleFile} loading={loading} />}
      {error && <div className="error-box">{error}</div>}
      {book && (
        <Reader
          book={book}
          flatItems={book.flatItems}
          chapterImageLists={book.chapterImageLists}
          onLoadAnotherBook={handleLoadAnotherBook}
        />
      )}
    </div>
  );
}
