import { useRef, useState } from 'react'
import { parseFile } from '../utils/fileParser'

function useCursorGlow() {
  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    e.currentTarget.style.setProperty('--mouse-x', `${x}%`)
    e.currentTarget.style.setProperty('--mouse-y', `${y}%`)
  }
  return { onMouseMove: handleMouseMove }
}

export default function FileUpload({ onFileLoaded, onTestSample }) {
  const inputRef = useRef(null)
  const cardRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [ripples, setRipples] = useState([])
  const glow = useCursorGlow()

  async function handleFile(file) {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setParseError(`File is ${(file.size / (1024 * 1024)).toFixed(1)} MB — maximum allowed size is 2 MB. Please reduce the file or split it into smaller batches.`)
      return
    }
    setParsing(true)
    setParseError(null)
    try {
      const data = await parseFile(file)
      onFileLoaded(data, file.name)
    } catch (e) {
      setParseError(e.message)
    } finally {
      setParsing(false)
    }
  }

  function addRipple(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(r => [...r, { id, x, y }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 1000)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  function onClick(e) {
    if (parsing) return
    addRipple(e)
    inputRef.current.click()
  }

  return (
    <div className="upload-zone-wrap">
      <div
        ref={cardRef}
        className={`upload-card${dragOver ? ' drag-over' : ''}`}
        onClick={onClick}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        {...glow}
      >
        {ripples.map(r => (
          <span key={r.id} className="upload-ripple" style={{ left: r.x, top: r.y }} />
        ))}

        <div className="upload-icon-wrap">
          <div className="upload-icon-ring" />
          <div className="upload-icon-ring-2" />
          <span className="upload-icon">{parsing ? '⏳' : '📂'}</span>
        </div>

        <h3>{parsing ? 'Parsing your file…' : 'Drop your statement here'}</h3>
        <p>{parsing ? 'Please wait' : 'Drag & drop or click to browse'}</p>

        {!parsing && (
          <div className="upload-btn-row">
            <button className="upload-btn" type="button">Choose File</button>
            <button
              className="upload-btn-sample"
              type="button"
              onClick={e => { e.stopPropagation(); onTestSample?.() }}
            >
              Try Sample
            </button>
          </div>
        )}

        <div className="supported-formats">
          <span className="format-badge">CSV</span>
          <span className="format-badge">XLSX</span>
          <span className="format-badge">XLS</span>
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-3)' }}>· Max 2 MB</span>
        </div>
      </div>

      {parseError && (
        <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 10, textAlign: 'center', fontFamily: 'var(--text-mono)' }}>
          ⚠ {parseError}
        </p>
      )}

      {/* Security Badge */}
      <div className="security-badge">
        <div className="security-dot" />
        <span className="security-text">AES-256 · End-to-End Encrypted · No Storage</span>
        <span className="security-lock">🔒</span>
        <div className="security-badge-shine" />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={onInputChange}
      />
    </div>
  )
}
