import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo-unxet.png';

type HeaderProps = {
  userName: string;
  userRole?: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const Header: React.FC<HeaderProps> = ({ userName, userRole }) => {
  const initials = useMemo(() => getInitials(userName), [userName]);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node | null;
      if (
        target &&
        (menuRef.current?.contains(target) || buttonRef.current?.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <header className="w-full border-b border-[#E5E7EB] bg-white fixed top-0 h-16 z-50">
      <div className="mx-auto max-w-7xl px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/inbox" className="flex items-center gap-2 select-none">
            <img src={logo} alt="Unxet logo" className="w-36" />
          </Link>
        </div>
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-[#0A84FF] text-white flex items-center justify-center font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A84FF]"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Abrir menu do usuÃ¡rio"
          >
            {initials}
          </button>
          {open && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 mt-2 w-64 rounded-lg border border-[#E5E7EB] bg-white shadow-lg z-50 overflow-hidden"
            >
              <div className="px-4 py-3 bg-[#F9FAFB]">
                <div className="text-sm text-gray-500">Conta</div>
                <div className="text-[#1E1E1E] font-medium">{userName}</div>
                {userRole && (
                  <div className="text-sm text-gray-600">{userRole}</div>
                )}
              </div>
              <div className="py-1">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#F3F4F6]"
                  onClick={() => setOpen(false)}
                >
                  Perfil
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#F3F4F6]"
                  onClick={() => setOpen(false)}
                >
                  ConfiguraÃ§Ãµes
                </button>
                <div className="my-1 h-px bg-[#E5E7EB]" />
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => setOpen(false)}
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};


