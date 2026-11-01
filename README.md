# Wishy · Birthday Wish Maker

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
