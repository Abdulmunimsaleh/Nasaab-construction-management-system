import React from 'react';
import { Modal } from './Modal';
import {
  FileSpreadsheet
} from 'lucide-react';

export const QuickActionModal = ({
  isOpen,
  onClose,
  onSelectAction
}) => {
  const actions = [
    {
      id: 'daily-report',
      title: 'Submit Daily Site Report',
      description: 'Record weather, activities, plant hours & daily site progress',
      icon: FileSpreadsheet,
      color: 'bg-amber-100 text-amber-700',
      badge: 'Primary'
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Site Quick Actions"
      subtitle="Rapidly record activities happening on site without navigating away"
      maxWidth="max-w-xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-2xs hover:border-amber-400 hover:bg-amber-50/30 transition-all duration-150 active:scale-98"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${act.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors truncate">
                    {act.title}
                  </h4>
                  {act.badge && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                      {act.badge}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {act.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
