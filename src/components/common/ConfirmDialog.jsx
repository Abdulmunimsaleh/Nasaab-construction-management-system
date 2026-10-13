import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone. Are you sure you wish to proceed?',
  confirmLabel = 'Confirm Action',
  confirmVariant = 'danger' // 'danger' | 'primary'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors ${
              confirmVariant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4 pt-1">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          confirmVariant === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
        }`}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-base font-bold text-slate-900">{title}</h4>
          <p className="mt-1 text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </Modal>
  );
};
