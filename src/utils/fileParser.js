import Papa from 'papaparse'

export async function parseFile(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file)
  if (ext === 'pdf') return parsePDF(file, onProgress)

  throw new Error(`Unsupported file type: .${ext}`)
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length && !results.data.length) {
          reject(new Error(results.errors[0].message))
        } else {
          resolve(results.data)
        }
      },
      error: (err) => reject(new Error(err.message)),
    })
  })
}

async function parseExcel(file) {
  const { read, utils } = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = utils.sheet_to_json(ws, { defval: '' })
  if (!data.length) throw new Error('Excel file appears to be empty')
  return data
}

async function parsePDF(file, onProgress) {
  const pdfjsLib = await import('pdfjs-dist')

  // Use CDN worker — avoids Vite/Vercel bundling issues and loads faster
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise

  const MAX_PAGES = 15
  const totalPages = Math.min(pdf.numPages, MAX_PAGES)

  onProgress?.({ stage: 'pdf', current: 0, total: totalPages })

  // Process all pages in parallel instead of sequentially
  const pageTexts = await Promise.all(
    Array.from({ length: totalPages }, async (_, i) => {
      const page = await pdf.getPage(i + 1)
      const content = await page.getTextContent()
      onProgress?.({ stage: 'pdf', current: i + 1, total: totalPages })
      return content.items.map(s => s.str).join(' ')
    })
  )

  const fullText = pageTexts.join('\n')
  const rows = parsePDFText(fullText)
  if (!rows.length) throw new Error('Could not extract transaction data from PDF')
  return rows
}

function parsePDFText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const rows = []

  for (const line of lines) {
    const parts = line.split(/\s{2,}|\t/)
    if (parts.length >= 3) {
      const row = {}
      parts.forEach((p, i) => { row[`column_${i + 1}`] = p })
      rows.push(row)
    }
  }

  return rows
}
