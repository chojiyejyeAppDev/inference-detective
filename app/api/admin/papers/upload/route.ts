import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  // Admin auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Parse multipart form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file || !file.name.endsWith('.pdf')) {
    return NextResponse.json({ error: 'PDF 파일을 업로드해주세요.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const service = createServiceClient(supabaseUrl, serviceKey)

  // Upload to Supabase Storage
  const storagePath = `papers/${Date.now()}-${file.name}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await service.storage
    .from('papers')
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `업로드 실패: ${uploadError.message}` }, { status: 500 })
  }

  // Insert papers record
  const { data: paper, error: dbError } = await service
    .from('papers')
    .insert({
      filename: file.name,
      storage_path: storagePath,
      status: 'pending',
    })
    .select('id')
    .single()

  if (dbError) {
    return NextResponse.json({ error: `DB 저장 실패: ${dbError.message}` }, { status: 500 })
  }

  // Fire-and-forget: trigger processing
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  fetch(`${appUrl}/api/admin/papers/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paperId: paper.id }),
  }).catch(err => console.error('[papers/upload] Failed to trigger processing:', err))

  return NextResponse.json({
    success: true,
    paper: { id: paper.id, filename: file.name, status: 'pending' },
  })
}
