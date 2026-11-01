# Wishy · Birthday Wish Maker

## The flow (manual payment + access codes)
1. A user fills in the form and previews it for free.
2. They press **Create link**. A dialog asks for an access code, with a
   **Get one on WhatsApp** button that opens a chat with you.
3. They pay you directly (bank transfer, e-wallet, etc.).
4. You open **/admin.html**, generate a code (note who bought it) and press **Message**.
   It copies a ready-to-send WhatsApp message with the code and their personal editor link.
5. They type the code (or just open the editor link, which fills it in) and press **Create link**.
   The code is used up and their gift link is live.
6. **Update link** is free forever. Opening the editor link again, on any device,
   reopens their gift for editing. If two devices edit at the same time,
   whichever presses Update link last wins.
7. **Make a cute QR** (on the "Your gift link is live" card): pick a shape
   (Big heart, Little hearts, Bubble, Petals, Soft classic), a color, a heart or initial
   in the middle, and an optional caption. Download as PNG (1080 px) or share it.
   The QR is made in the browser; nothing extra is stored on the server.

## Project structure
public/                          the website (served as-is, no build step)
  index.html                     editor + gift page
  admin.html                     your admin page (codes)
  css/                           base, builder, gift, qr, admin, responsive
  js/main.js                     start: editor, editor link (?code=) or gift link
  js/core/                       utils, themes, model (data), storage, api
  js/ui/                         confetti, decorations
  js/builder/                    editor, form templates, photos, publish
  js/gift/                       quiz + birthday page, music player
  js/qr/qrcode.js                QR encoder (no libraries)
  js/qr/qr-styles.js             cute QR shapes and colors
  js/qr/qr-maker.js              the "Make a cute QR" window
  js/admin/admin.js              admin page
netlify/functions/
  gifts.mjs                      /api/gifts        create (needs code) / read / update
  img.mjs                        /api/img          photos
  redeem.mjs                     /api/redeem       check a code / reopen a gift by code
  admin.mjs                      /api/admin/codes  list + generate codes (password)
  config.mjs                     /api/config       WhatsApp number + price text
netlify/lib/shared.mjs           storage, codes, security helpers

## Setup
In Netlify: Project configuration > Environment variables, add
(choose "Same value for all deploy contexts"):
  ADMIN_PASSWORD    a long password only you know (at least 8 characters)
  WHATSAPP_NUMBER   your number with country code, no + or spaces, e.g. 6281234567890
  PRICE_TEXT        shown on the WhatsApp button, e.g. Rp15.000   (optional)
Then redeploy (Deploys > Trigger deploy).

Admin page: https://YOUR-SITE.netlify.app/admin.html

Deploy from GitHub (Netlify Drop does not run functions). Stored data is under your site > Blobs
(stores: gifts, gift-images, codes).
