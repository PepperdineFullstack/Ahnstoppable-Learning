import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function DropdownMenu(){ 
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { label: 'Home', path: '/home', handleClick: () => {} },
    // { label: 'Class Dashboard', path: '/class' },
    { label: 'Sign Out', path: '/' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(prev => !prev)}>
        <span className="text-slate-900 dark:text-slate-400 font-semibold text-4xl cursor-pointer 
          hover:text-slate-900/90 hover:dark:text-slate-400/90 transition-colors">
          ☰
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 
          rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => { item.handleClick; navigate(item.path); setIsOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-300
                hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg
                transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export default DropdownMenu;