import Papa from 'papaparse'

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file)
  if (ext === 'pdf') return parsePDF(file)

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

async function parsePDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()

  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map(s => s.str).join(' ') + '\n'
  }

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
