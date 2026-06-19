import React from "react";
import { Trash2, X } from "lucide-react";

export function FormModal({ title, detail, children, onClose }) {
  return <ModalShell className="form-modal" labelledBy="form-modal-title" title={title} detail={detail} onClose={onClose}>{children}</ModalShell>;
}

export function FullViewModal({ title, detail, children, onClose }) {
  return <ModalShell className="full-view-modal" labelledBy="full-modal-title" title={title} detail={detail} onClose={onClose}>{children}</ModalShell>;
}

export function ConfirmModal({ title, detail, confirmLabel, busy, onConfirm, onClose }) {
  return (
    <ModalShell className="confirm-modal" labelledBy="confirm-modal-title" title={title} detail={detail} onClose={onClose}>
      <div className="button-row"><button className="danger solid-danger" type="button" disabled={busy} onClick={onConfirm}><Trash2 size={16} /> {confirmLabel}</button><button className="ghost" type="button" onClick={onClose}>Cancel</button></div>
    </ModalShell>
  );
}

function ModalShell({ className, labelledBy, title, detail, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onMouseDown={(event) => event.stopPropagation()}>
        <ModalHead id={labelledBy} title={title} detail={detail} onClose={onClose} />
        {children}
      </section>
    </div>
  );
}

function ModalHead({ id, title, detail, onClose }) {
  return <header className="modal-head"><div><h2 id={id}>{title}</h2><p>{detail}</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>;
}
