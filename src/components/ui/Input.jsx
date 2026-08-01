import React from 'react';

export default function Input({ label, type, onBlur, onChange, ...props }) {
  const labelText = label || props.placeholder;
  const isTextArea = type === 'textarea';
  const Component = isTextArea ? 'textarea' : 'input';

  const handleBlur = (e) => {
    if (e.target.value && typeof e.target.value === 'string') {
      const trimmedValue = e.target.value.trim();
      if (trimmedValue !== e.target.value) {
        if (onChange) {
          const newEvent = {
            ...e,
            target: {
              ...e.target,
              value: trimmedValue,
              name: e.target.name
            }
          };
          onChange(newEvent);
        }
      }
    }
    if (onBlur) onBlur(e);
  };
  
  return (
    <div className="input-group">
      <Component 
        {...props} 
        onBlur={handleBlur}
        onChange={onChange}
        type={isTextArea ? undefined : type}
        placeholder={props.placeholder || ' '} 
        className={`floating-input ${props.className || ''}`}
      />
      {labelText && <label className="floating-label">{labelText}</label>}
    </div>
  );
}
