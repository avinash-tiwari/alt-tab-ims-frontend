import React from 'react';

export default function Input({ label, type, ...props }) {
  const labelText = label || props.placeholder;
  const isTextArea = type === 'textarea';
  const Component = isTextArea ? 'textarea' : 'input';
  
  return (
    <div className="input-group">
      <Component 
        {...props} 
        type={isTextArea ? undefined : type}
        placeholder={props.placeholder || ' '} 
        className={`floating-input ${props.className || ''}`}
      />
      {labelText && <label className="floating-label">{labelText}</label>}
    </div>
  );
}
