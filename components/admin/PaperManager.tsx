'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Paper {
  id: string
  filename: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  questions_generated: number
  error_message: string | null
  created_at: string
  processed_at: string | null
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '대기 중', color: 'text-yellow-400 bg-yellow-500/10' },
  processing: { text: '처리 중', color: 'text-blue-400 bg-blue-500/10' },
  done: { text: '완료', color: 'text-emerald-400 bg-emerald-500/10' },
  failed: { text: '실패', color: 'text-red-400 bg-red-500/10' },
}

export default function PaperManager() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const fetchPapers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('papers')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setPapers(data as Paper[])
  }, [])

  useEffect(() => {
    fetchPapers()
    const interval = setInterval(fetchPapers, 10000)
    return () => clearInterval(interval)
  }, [fetchPapers])

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    setError('')

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.pdf')) {
        setError(`${file.name}: PDF 파일만 업로드 가능합니다.`)
        continue
      }

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/admin/papers/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error || '업로드 실패')
        }
      } catch {
        setError('네트워크 오류')
      }
    }

    setUploading(false)
    fetchPapers()
  }

  const handleReprocess = async (paperId: string) => {
    const supabase = createClient()
    await supabase.from('papers').update({ status: 'pending' }).eq('id', paperId)

    fetch('/api/admin/papers/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId }),
    }).catch(() => {})

    fetchPapers()
  }

  const handleDelete = async (paperId: string) => {
    if (!confirm('이 논문과 관련 데이터를 삭제하시겠습니까?')) return

    const supabase = createClient()
    const paper = papers.find(p => p.id === paperId)

    if (paper) {
      await supabase.storage.from('papers').remove([paper.filename])
    }

    await supabase.from('papers').delete().eq('id', paperId)
    fetchPapers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">논문 관리</h2>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Upload area */}
      <label
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
          uploading
            ? 'border-amber-500/40 bg-amber-500/5'
            : 'border-slate-700 hover:border-slate-500 bg-slate-900/30'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={(e) => handleUpload(e.target.files)}
          disabled={uploading}
          className="hidden"
          aria-label="PDF 파일 업로드"
        />
        {uploading ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-amber-400">업로드 중...</span>
          </div>
        ) : (
          <>
            <svg className="w-8 h-8 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <p className="text-sm text-slate-400">PDF 파일을 드래그하거나 클릭하여 업로드</p>
            <p className="text-xs text-slate-500 mt-1">다중 파일 가능</p>
          </>
        )}
      </label>

      {/* Papers table */}
      {papers.length > 0 && (
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-slate-400 font-medium">파일명</th>
                <th className="text-center px-4 py-3 text-xs text-slate-400 font-medium">상태</th>
                <th className="text-center px-4 py-3 text-xs text-slate-400 font-medium">생성 문제</th>
                <th className="text-center px-4 py-3 text-xs text-slate-400 font-medium">업로드일</th>
                <th className="text-right px-4 py-3 text-xs text-slate-400 font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {papers.map((paper) => {
                const statusInfo = STATUS_LABELS[paper.status] ?? STATUS_LABELS.pending
                return (
                  <tr key={paper.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-200 truncate max-w-[200px]">
                      {paper.filename}
                      {paper.status === 'failed' && paper.error_message && (
                        <p className="text-xs text-red-400 mt-0.5 truncate">{paper.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {paper.status === 'processing' && (
                          <span className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                        )}
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {paper.questions_generated}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-xs">
                      {new Date(paper.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {(paper.status === 'done' || paper.status === 'failed') && (
                          <button
                            onClick={() => handleReprocess(paper.id)}
                            className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
                          >
                            재처리
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(paper.id)}
                          className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {papers.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-8">
          아직 업로드된 논문이 없습니다.
        </p>
      )}
    </div>
  )
}
