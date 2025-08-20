import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = '/api';

function App() {
  const [scores, setScores] = useState([]);
  const [query, setQuery] = useState({ text: '', aCappellaOnly: false });
  const [form, setForm] = useState({ title: '', arranger: '', style: '', tempo: '', a_cappella: false });
  const [file, setFile] = useState(null);
  const [uploadingScores, setUploadingScores] = useState([]);

  const fetchScores = async (q) => {
    try {
      const res = await axios.get(`${API_BASE}/scores`, {
        params: {
          q: q.text || '',
          a_cappella: q.aCappellaOnly ? 1 : undefined,
          t: Date.now()
        }
      });

      setScores(res.data.map(score => ({
        ...score,
        a_cappella: score.a_cappella == 1
      })));
    } catch (err) {
      console.error("Failed to fetch scores:", err);
    }
  };

  useEffect(() => {
    fetchScores(query);
  }, [query]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please select a PDF file');

    const tempId = Date.now();

    const optimisticScore = {
      id: tempId,
      title: form.title,
      arranger: form.arranger,
      style: form.style,
      tempo: form.tempo,
      a_cappella: form.a_cappella,
      filename: 'uploading.pdf',
      optimistic: true
    };

    setScores(prev => [optimisticScore, ...prev]);
    setUploadingScores(prev => [...prev, { id: tempId, progress: 0 }]);
    setForm({ title: '', arranger: '', style: '', tempo: '', a_cappella: false });
    setFile(null);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key !== 'a_cappella') formData.append(key, value);
    });
    formData.append('a_cappella', form.a_cappella ? '1' : '0');
    formData.append('pdf', file);

    try {
      const response = await axios.post(`${API_BASE}/upload`, formData, {
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setUploadingScores(prev =>
            prev.map(u => u.id === tempId ? { ...u, progress: percent } : u)
          );
        }
      });

      const realId = response.data.id;

      setScores(prev =>
        prev.map(score =>
          score.id === tempId
            ? {
                ...score,
                id: realId,
                filename: `${realId}.pdf`, // or use response.filename if returned
                optimistic: false
              }
            : score
        )
      );
    } catch (err) {
      console.error("Upload failed:", err);
      setScores(prev => prev.filter(score => score.id !== tempId));
      alert("Upload failed.");
    } finally {
      setUploadingScores(prev => prev.filter(u => u.id !== tempId));
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this score?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE}/scores/${id}`);
      await fetchScores(query);
    } catch (err) {
      console.error("Failed to delete score:", err);
      alert("An error occurred while trying to delete the score.");
    }
  };

  return (
    <div className="app">
      <h1>🎼 Mt. SAC Vocal Jazz Library</h1>

      <input
        className="search"
        placeholder="Search by title, arranger, style, tempo"
        value={query.text}
        onChange={(e) =>
          setQuery(prev => ({ ...prev, text: e.target.value }))
        }
      />

      <h2>Upload Score</h2>
      <form className="upload-form" onSubmit={handleUpload}>
        <input placeholder="Title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <input placeholder="Arranger" required value={form.arranger} onChange={e => setForm({ ...form, arranger: e.target.value })} />
        <input placeholder="Style" required value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} />
        <input placeholder="Tempo" required value={form.tempo} onChange={e => setForm({ ...form, tempo: e.target.value })} />
        <label>
          <input
            type="checkbox"
            checked={form.a_cappella}
            onChange={e => setForm({ ...form, a_cappella: e.target.checked })}
          />
          A cappella
        </label>

        <div className="file-upload-row">
          <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} />
          <button type="submit">Upload Score</button>
        </div>
      </form>

      <label>
        <input
          type="checkbox"
          checked={query.aCappellaOnly}
          onChange={e => setQuery(prev => ({ ...prev, aCappellaOnly: e.target.checked }))}
        />
        Show only A cappella
      </label>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Arranger</th>
            <th>Style</th>
            <th>Tempo</th>
            <th>A cappella</th>
            <th>PDF</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {scores.map(score => (
            <tr key={score.id}>
              <td data-label="Title">{score.title}</td>
              <td data-label="Arranger">{score.arranger}</td>
              <td data-label="Style">{score.style}</td>
              <td data-label="Tempo">{score.tempo}</td>
              <td data-label="A Cappella">{score.a_cappella ? '✅' : ''}</td>
              <td data-label="PDF">
                {score.optimistic ? (
                  <>
                    Uploading...
                    {(() => {
                      const u = uploadingScores.find(us => us.id === score.id);
                      return u ? (
                        <div className="upload-progress">
                          <div className="progress-bar" style={{ width: `${u.progress}%` }}>
                            {u.progress}%
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </>
                ) : (
                  <a href={`${API_BASE}/pdfs/${score.filename}`} target="_blank" rel="noopener noreferrer">
                    Download
                  </a>
                )}
              </td>
              <td data-label="Delete">
                {!score.optimistic && (
                  <button onClick={() => handleDelete(score.id)}>🗑️</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
