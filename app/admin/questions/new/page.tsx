import QuestionForm from '../QuestionForm'

export default function NewQuestionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">새 문제 추가</h1>
      <QuestionForm />
    </div>
  )
}
