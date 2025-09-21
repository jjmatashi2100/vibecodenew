import React, { useState, useEffect } from 'react';

export function QuestionPanel({ questions = [], onSubmit }: any) {
  const [answers, setAnswers] = useState<string[]>(Array.from({ length: questions.length }, () => ''));

  // reset answers whenever the questions change
  useEffect(() => {
    setAnswers(Array.from({ length: questions.length }, () => ''));
  }, [questions]);

  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h4 className="text-lg font-semibold text-white">Questions</h4>
      {questions.map((q: any, i: number) => (
        <div key={i} className="space-y-1">
          <div className="text-gray-300">{typeof q === 'string' ? q : q.text}</div>
          <textarea className="w-full p-2 bg-gray-800 text-white rounded" value={answers[i]} onChange={e => {
            const a = [...answers]; a[i] = e.target.value; setAnswers(a);
          }} />
        </div>
      ))}
      <button onClick={()=>onSubmit(answers)} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Submit Answers</button>
    </div>
  );
}
