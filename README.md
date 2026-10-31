# Birthday Wish Maker

## What's inside
public/index.html            the whole website (editor + gift page)
netlify/functions/gifts.mjs  saves and loads gifts            (/api/gifts)
netlify/functions/img.mjs    saves and serves uploaded photos (/api/img)
netlify/lib/shared.mjs       small helpers
netlify.toml                 Netlify settings (+ makes /g/<id> links work)
package.json                 installs @netlify/blobs (the storage)

## Deploy (pick one)
Drag-and-drop (Netlify Drop) only uploads static files and will NOT run the
functions, so "Create link" won't work that way. Use one of these instead:

A) GitHub (easiest to keep updating)
   1. Create a GitHub repo and upload this whole folder.
   2. Netlify -> Add new project -> Import an existing project -> pick the repo.
   3. Leave the build settings as they are (netlify.toml sets them) -> Deploy.

B) Netlify CLI
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod      (run inside this folder)

No database or API keys to set up: Netlify Blobs is connected automatically.

## How it works
/            editor. Create link -> photos upload, gift is saved, you get /g/<id>
/g/<id>      what the birthday person opens
Update link  changes the same link (only from the browser that created it)
New gift     clears the form so you can make a gift for someone else
Download file  still makes a single offline HTML file

Stored data can be seen/deleted in the Netlify dashboard -> your site -> Blobs.
