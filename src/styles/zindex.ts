/**
 * G-Track Z-Index Scale
 *
 * sticky / table headers : z-10
 * FABs / floating buttons : z-20  (reserved; chat-fab uses z-30 to clear mobile nav)
 * dropdowns / popovers   : z-30
 * navbar / bottom nav    : z-40
 * modals / drawers       : z-50
 * toasts / confirmations : z-[60]
 * system banners         : z-[70]
 *
 * Note: ConfirmDialog uses z-[60] to ensure it sits above standard z-50 modals.
 * Toast uses z-[60] for the same reason.
 * Offline / connection banner uses z-[70] to always be visible above everything.
 */

export const Z = {
  sticky: 'z-10',
  fab: 'z-30',
  dropdown: 'z-30',
  navbar: 'z-40',
  modal: 'z-50',
  toast: 'z-[60]',
  banner: 'z-[70]',
} as const
