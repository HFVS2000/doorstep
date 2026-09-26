// Everything that changes from one charity client to the next lives here.
// To onboard a new client, copy this file, change the values, and point
// `activeClient` at it.

export type Frequency = 'Monthly' | 'Quarterly' | 'Yearly';

export interface Programme {
  id: string;
  label: string;
  kind: 'lottery' | 'giving';
  /** Lottery entry types, e.g. "One chance". Only for kind "lottery". */
  entries?: { id: string; label: string }[];
  /** Suggested gift amounts in pounds. Only for kind "giving". */
  amounts?: number[];
  frequencies: Frequency[];
  /** Gift Aid can only be claimed on donations, never on lottery entries. */
  giftAid: boolean;
}

export interface LegalText {
  title: string;
  paragraphs: string[];
}

export interface ClientConfig {
  id: string;
  appName: string;
  orgName: string;
  /** Legal name shown on the Direct Debit instruction. */
  payeeName: string;
  logoText: string;
  logoUrl?: string;
  colours: { brand: string; brandDark: string; brandSoft: string; accent: string; accentSoft: string };
  programmes: Programme[];
  collectionDays: string[];
  contactChannels: string[];
  legal: { terms: LegalText; lottery?: LegalText; privacy: LegalText };
  /** Map opens here when GPS is unavailable. [lng, lat] */
  defaultCentre: [number, number];
  minAge: number;
}

export const ehaat: ClientConfig = {
  id: 'ehaat',
  appName: 'EHAAT Doorstep',
  orgName: 'Essex & Herts Air Ambulance',
  payeeName: 'Essex & Herts Air Ambulance Trust',
  logoText: 'LOGO',
  colours: { brand: '#D6001C', brandDark: '#A80016', brandSoft: '#FFE3E6', accent: '#FFD400', accentSoft: '#FFF6C2' },
  programmes: [
    {
      id: 'lottery',
      label: 'Flight for Life Lottery',
      kind: 'lottery',
      entries: [
        { id: 'one', label: 'One chance' },
        { id: 'super', label: 'Super draw chance' },
      ],
      frequencies: ['Monthly', 'Quarterly', 'Yearly'],
      giftAid: false,
    },
    {
      id: 'giving',
      label: 'Regular Giving',
      kind: 'giving',
      amounts: [5, 10, 15, 20],
      frequencies: ['Monthly', 'Quarterly', 'Yearly'],
      giftAid: true,
    },
  ],
  collectionDays: ['1st', '15th', '28th'],
  contactChannels: ['Post', 'Phone', 'Email', 'Text'],
  legal: {
    terms: {
      title: 'Terms and Conditions',
      paragraphs: [
        'Placeholder text. The approved terms go here.',
        'Your gift or lottery entry starts from the first collection date shown on your confirmation letter.',
        'You can change or cancel at any time by calling the Supporter Care team or contacting your bank.',
        'We will write to you within 10 working days with your Direct Debit confirmation and reference.',
      ],
    },
    lottery: {
      title: 'Flight for Life Lottery rules',
      paragraphs: [
        'Placeholder text. The licensed society lottery rules go here.',
        'Players must be 18 or over and resident in Great Britain.',
        'Promoter details and licence number to be added.',
      ],
    },
    privacy: {
      title: 'How we use your data',
      paragraphs: [
        'Placeholder text. The privacy notice goes here.',
        'Your details are used to process your Direct Debit and manage your support. They are never sold.',
        'You can ask to see, change or delete your data at any time.',
      ],
    },
  },
  defaultCentre: [0.4655, 51.7208], // Moulsham Lodge, Chelmsford
  minAge: 18,
};

export const activeClient = ehaat;
