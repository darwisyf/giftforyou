// GET /api/config -> public settings for the page
//   WHATSAPP_NUMBER   your number with country code, e.g. 6281234567890
//   PRICE_TEXT        shown to users, e.g. "Rp15.000"
import { json } from '../lib/shared.mjs';

export default async () => json({
  whatsapp: (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, ''),
  priceText: process.env.PRICE_TEXT || ''
});

export const config = { path: '/api/config' };
