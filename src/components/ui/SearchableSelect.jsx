import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export default function SearchableSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select an option",
  label,
  disabled = false,
  required = false,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = options.filter(opt => 
    String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm("");
    }
  };

  const handleSelect = (opt) => {
    onChange({ target: { value: opt.value } });
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={`searchable-select-container ${className}`} ref={containerRef}>
      {label && <label className="searchable-select-label">{label}</label>}
      <div 
        className={`searchable-select-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
      >
        <span className={!selectedOption ? 'placeholder' : ''}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          <div className="searchable-select-search-container">
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="searchable-select-search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <X 
                size={16} 
                className="clear-icon" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm("");
                }} 
              />
            )}
          </div>
          <div className="searchable-select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`searchable-select-option ${String(opt.value) === String(value) ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="searchable-select-no-results">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
