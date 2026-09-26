import type { DoorStatus } from './store';

export const STATUS: Record<DoorStatus, { label: string; bg: string; fg: string }> = {
  none: { label: 'Not knocked', bg: '#FFFFFF', fg: '#0A0A0A' },
  signed: { label: 'Signed up', bg: '#00873C', fg: '#FFFFFF' },
  ni: { label: 'Not interested', bg: '#D6001C', fg: '#FFFFFF' },
  na: { label: 'No answer', bg: '#9AA0A6', fg: '#0A0A0A' },
  cb: { label: 'Callback', bg: '#FFD400', fg: '#0A0A0A' },
};
