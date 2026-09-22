import express from 'express'
import cors from 'cors'
import db from './db.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json())

const fallbackQuote = {
  content: 'Success is the sum of small efforts, repeated day in and day out.',
  author: 'Robert Collier',
  tags: ['success', 'habit', 'growth'],
}

const formatFavorite = (row) => ({
  id: row.id,
  quote: row.quote,
  author: row.author,
  tags: JSON.parse(row.tags || '[]'),
  createdAt: row.created_at,
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Quote API is running.' })
})

app.get('/api/quote', async (_req, res) => {
  try {
    const response = await fetch('https://api.quotable.io/random')

    if (!response.ok) {
      throw new Error('Failed to fetch from public API')
    }

    const data = await response.json()

    const quote = {
      content: data.content || data.text || 'The best way to predict the future is to create it.',
      author: data.author || 'Peter Drucker',
      tags: Array.isArray(data.tags) ? data.tags : ['inspiration'],
    }

    return res.json(quote)
  } catch (error) {
    console.error('Quote fetch error:', error.message)
    return res.json(fallbackQuote)
  }
})

app.get('/api/favorites', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM favorites ORDER BY id DESC')
    .all()
    .map(formatFavorite)

  return res.json(rows)
})

app.post('/api/favorites', (req, res) => {
  const { content, author, tags = [] } = req.body || {}

  if (!content || !author) {
    return res.status(400).json({ message: 'Quote content and author are required.' })
  }

  const normalizedQuote = content.trim()
  const normalizedAuthor = author.trim()
  const safeTags = Array.isArray(tags) ? tags : []

  const existing = db
    .prepare('SELECT * FROM favorites WHERE quote = ? AND author = ?')
    .get(normalizedQuote, normalizedAuthor)

  if (existing) {
    return res.status(200).json({
      message: 'Quote already saved in favorites.',
      favorite: formatFavorite(existing),
    })
  }

  const result = db
    .prepare(
      'INSERT INTO favorites (quote, author, tags, created_at) VALUES (?, ?, ?, ?)',
    )
    .run(normalizedQuote, normalizedAuthor, JSON.stringify(safeTags), new Date().toISOString())

  const favorite = db
    .prepare('SELECT * FROM favorites WHERE id = ?')
    .get(result.lastInsertRowid)

  return res.status(201).json({
    message: 'Quote saved to favorites.',
    favorite: formatFavorite(favorite),
  })
})

app.delete('/api/favorites/:id', (req, res) => {
  const { id } = req.params
  const result = db.prepare('DELETE FROM favorites WHERE id = ?').run(id)

  if (result.changes === 0) {
    return res.status(404).json({ message: 'Favorite not found.' })
  }

  return res.json({ message: 'Favorite removed.' })
})

app.listen(PORT, () => {
  console.log(`Quote API listening on http://localhost:${PORT}`)
})
