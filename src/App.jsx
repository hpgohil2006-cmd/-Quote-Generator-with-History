import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'quote-generator-favorites'
const API_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : null)

const getStoredFavorites = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const setStoredFavorites = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function App() {
  const [quote, setQuote] = useState({
    content: 'The future depends on what you do today.',
    author: 'Mahatma Gandhi',
    tags: ['future', 'action'],
  })
  const [favorites, setFavorites] = useState([])
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchQuote = async () => {
    setLoading(true)
    try {
      if (!API_URL) {
        const response = await fetch('https://api.quotable.io/random')
        const data = await response.json()
        setQuote({
          content: data.content || data.text || 'Big goals begin with one bold step.',
          author: data.author || 'Unknown',
          tags: Array.isArray(data.tags) ? data.tags : ['inspiration'],
        })
        return
      }

      const response = await fetch(`${API_URL}/quote`)
      const data = await response.json()
      setQuote(data)
    } catch (error) {
      console.error('Quote fetch failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFavorites = async () => {
    try {
      if (!API_URL) {
        setFavorites(getStoredFavorites())
        return
      }

      const response = await fetch(`${API_URL}/favorites`)
      const data = await response.json()
      setFavorites(data)
    } catch (error) {
      console.error('Favorites fetch failed:', error)
      setFavorites(getStoredFavorites())
    }
  }

  useEffect(() => {
    fetchQuote()
    fetchFavorites()
  }, [])

  const handleSaveFavorite = async () => {
    try {
      if (!API_URL) {
        const item = {
          id: Date.now(),
          quote: quote.content,
          author: quote.author,
          tags: quote.tags || [],
          createdAt: new Date().toISOString(),
        }

        const nextItems = [item, ...getStoredFavorites()].filter(
          (favorite, index, arr) =>
            arr.findIndex((entry) => entry.quote === favorite.quote && entry.author === favorite.author) === index,
        )

        setStoredFavorites(nextItems)
        setFavorites(nextItems)
        return
      }

      const response = await fetch(`${API_URL}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: quote.content,
          author: quote.author,
          tags: quote.tags,
        }),
      })

      if (response.ok) {
        fetchFavorites()
      }
    } catch (error) {
      console.error('Save favorite failed:', error)
    }
  }

  const handleCopy = async () => {
    const textToCopy = `“${quote.content}” — ${quote.author}`

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const handleDeleteFavorite = async (id) => {
    try {
      if (!API_URL) {
        const nextItems = getStoredFavorites().filter((favorite) => favorite.id !== id)
        setStoredFavorites(nextItems)
        setFavorites(nextItems)
        return
      }

      await fetch(`${API_URL}/favorites/${id}`, {
        method: 'DELETE',
      })
      fetchFavorites()
    } catch (error) {
      console.error('Delete favorite failed:', error)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-badge">✦</span>
          <div>
            <p className="eyebrow">Daily inspiration</p>
            <h1>Quote Generator</h1>
          </div>
        </div>
        <button type="button" className="primary-button" onClick={fetchQuote} disabled={loading}>
          {loading ? 'Loading...' : 'New Quote'}
        </button>
      </header>

      <main className="content-grid">
        <section className="quote-card panel">
          <div className="quote-mark">“</div>
          <p className="quote-text">{quote.content}</p>
          <div className="quote-meta">
            <span className="author">— {quote.author}</span>
            <div className="tag-list">
              {quote.tags?.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="action-row">
            <button type="button" className="ghost-button" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy Quote'}
            </button>
            <button type="button" className="primary-button" onClick={handleSaveFavorite}>
              Save to Favorites
            </button>
          </div>
        </section>

        <aside className="history-panel panel">
          <div className="panel-header">
            <h2>Favorites History</h2>
            <span className="history-count">{favorites.length}</span>
          </div>

          <div className="favorite-list">
            {favorites.length === 0 ? (
              <div className="empty-state">
                <p>No favorites yet.</p>
                <span>Save a quote to build your library.</span>
              </div>
            ) : (
              favorites.map((favorite) => (
                <article key={favorite.id} className="favorite-item">
                  <div className="favorite-copy">
                    <p>“{favorite.quote}”</p>
                    <small>— {favorite.author}</small>
                  </div>
                  <div className="favorite-actions">
                    <button
                      type="button"
                      className="mini-button"
                      onClick={() => navigator.clipboard.writeText(`“${favorite.quote}” — ${favorite.author}`)}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="mini-button danger"
                      onClick={() => handleDeleteFavorite(favorite.id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
