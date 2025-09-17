import React from 'react';

export function Editor({ value, onChange, height = '300px', language = 'text', readOnly = false }: any) {
  return (
    <textarea 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      style={{ height }}
      readOnly={readOnly}
      className="w-full px-3 py-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none font-mono" 
    />
  );
}
