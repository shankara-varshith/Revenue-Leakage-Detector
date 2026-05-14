import Papa from 'papaparse'

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()

  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file)
  if (ext === 'pdf') throw new Error('PDF files are not supported. Please export your statement as CSV or Excel from your bank or POS system.')

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

