
import React from 'react';

interface MessageModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
  type?: 'info' | 'error' | 'success';
}

const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  title,
  message,
  buttonLabel = 'Got it',
  onClose,
  type = 'info'
}) => {
  if (!isOpen) return null;

  const icons = {
    info: 'ℹ️',
    error: '⚠️',
    success: '✅'
  };

  const colors = {
    info: 'text-indigo-600 bg-indigo-50',
    error: 'text-red-600 bg-red-50',
    success: 'text-emerald-600 bg-emerald-50'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        <div className={`w-16 h-16 ${colors[type]} rounded-full flex items-center justify-center text-3xl mx-auto mb-6`}>
          {icons[type]}
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">{message}</p>
        
        <button
          onClick={onClose}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all hover:bg-slate-800"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
};

export default MessageModal;
