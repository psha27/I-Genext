import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { productivityTools } from '../lib/productivity'
import type { PlatformVideo } from '../lib/productivity'

export default function AdminPlatformMedia({ sessionExpired }: { sessionExpired: () => void }) {
  const [selected, setSelected] = useState(productivityTools[0].id)
  const [videos, setVideos] = useState<PlatformVideo[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const tool = productivityTools.find(item => item.id === selected)!
  const current = videos.find(video => video.id === selected)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/platform-videos', { signal: controller.signal }).then(async response => { if (response.status === 401) { sessionExpired(); return } if (!response.ok) throw new Error('Could not load platform videos. Please reload this tab.'); const rows = (await response.json()).videos as PlatformVideo[]; setVideos(rows); setTranscript(rows.find(video => video.id === productivityTools[0].id)?.transcript || '') }).catch(e => { if (e.name !== 'AbortError') setError(e.message) }).finally(() => setLoading(false))
    return () => controller.abort()
  }, [])
  useEffect(() => { if (!file) { setPreview(''); return } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url) }, [file])
  function choose(id: string) { setSelected(id); setFile(null); setTranscript(videos.find(video => video.id === id)?.transcript || ''); setError(''); setNotice(''); setRevision(value => value + 1) }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!file) { setError('Choose a video first.'); return }
    if (!['video/mp4', 'video/webm'].includes(file.type) || file.size > 100 * 1024 * 1024 || !file.size) { setError('Choose a non-empty MP4 or WebM file up to 100 MB.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const body = new FormData(); body.append('video', file); body.append('transcript', transcript)
      const response = await fetch('/api/admin/platform-videos/' + selected, { method: 'POST', body })
      if (response.status === 401) { sessionExpired(); return }
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Upload failed. Please try again.')
      setVideos(rows => [...rows.filter(video => video.id !== selected), result.video]); setFile(null); setRevision(value => value + 1); setNotice('Video published for ' + tool.name + '. Refresh the website to see the Watch video option.')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Upload failed. Please try again.') } finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('Remove the published video for ' + tool.name + '? Its illustration will remain visible.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/admin/platform-videos/' + selected, { method: 'DELETE' })
      if (response.status === 401) { sessionExpired(); return }
      if (!response.ok) throw new Error((await response.json()).message || 'Could not remove the video.')
      setVideos(rows => rows.filter(video => video.id !== selected)); setNotice('Video removed. The illustration remains available.'); setTranscript('')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not remove the video.') } finally { setBusy(false) }
  }
  return <section className="admin-platform-media"><h2>Platform videos</h2><p>Publish a product walkthrough for each Business Productivity &amp; Efficiency Tool. Visitors can choose between the illustration and your video.</p>
    {loading ? <p role="status">Loading videos…</p> : <div className="admin-media-layout"><nav aria-label="Choose a productivity tool" className="admin-media-tools">{productivityTools.map(item => <button key={item.id} disabled={busy} aria-pressed={selected === item.id} onClick={() => choose(item.id)}><strong>{item.name}</strong><small>{videos.some(video => video.id === item.id) ? 'Video published' : 'Illustration only'}</small></button>)}</nav>
      <div className="admin-media-editor"><h3>{tool.name}</h3><p>{tool.category}</p><a href={'/#tool-' + selected} target="_blank" rel="noreferrer">View website section ↗</a>
        <div className="admin-video-preview">{preview || current ? <video key={preview || current?.url} src={preview || current?.url} controls playsInline preload="metadata" aria-label={tool.name + ' video preview'}/> : <img src={'/profile/' + tool.image} alt={tool.name + ' illustration background'} />}</div>
        {current && <p className="admin-media-meta">Published {new Date(current.updatedAt).toLocaleString()} · {(current.size / 1024 / 1024).toFixed(1)} MB</p>}
        <form onSubmit={upload}><label className="field">{current ? 'Replace video' : 'Upload a video'}<input key={selected + revision} type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy} onChange={event => { const next = event.target.files?.[0] || null; setError(''); setNotice(''); if (next && (next.size > 100 * 1024 * 1024 || !['video/mp4', 'video/webm'].includes(next.type))) { setFile(null); event.target.value = ''; setError('Choose an MP4 or WebM video up to 100 MB.'); return } setFile(next) }}/></label>
          <p className="admin-media-meta">MP4 or WebM, up to 100 MB. Use browser-compatible encoding (H.264/AAC for MP4 or VP8/VP9 with Opus for WebM). Preview before publishing.</p>
          <label className="field">Video transcript (optional)<textarea value={transcript} maxLength={6000} rows={5} disabled={busy} onChange={event => setTranscript(event.target.value)} placeholder="Add the spoken content so visitors can read the walkthrough."/></label>
          <div className="button-row"><button className="btn btn-primary btn-large" disabled={busy || !file}>{busy ? 'Saving video…' : current ? 'Replace & publish video' : 'Upload & publish video'}</button>{current && <button type="button" className="admin-secondary" disabled={busy} onClick={remove}>Remove published video</button>}</div>
        </form>
        {busy && <p role="status">Saving your changes. Keep this page open.</p>}{error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
      </div>
    </div>}
  </section>
}