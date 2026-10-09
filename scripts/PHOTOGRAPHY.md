# Photography feed

`photography.html` is generated from `data/photography.json` using
`scripts/photography.template.html`. It is ordinary static HTML: real images and
native expandable details work without JavaScript, including local file previews.

## Refresh

Run `python3 scripts/sync-photography.py` to read the public Pixieset homepage and
its first three collections, in homepage order. Only publicly exposed album
metadata is read: titles, covers, listed dates, photo counts, description,
photographer and cover dimensions. Undated albums remain undated. Photo EXIF,
private galleries, client accounts and administrative metadata are not available
through this public feed and are not inferred.

Run `python3 scripts/sync-photography.py --render` to regenerate the HTML from the
verified snapshot without a network request. Edit the template for page layout;
do not edit the generated album cards directly.

The initial snapshot was verified from the public pages on 10 October 2026.
Pixieset currently challenges ordinary automated HTTP requests with Cloudflare.
**Automatic refresh is prepared, but is not yet a verified live integration.**
The script never solves challenges, imports browser cookies or uses a CORS proxy.
All three albums are fetched and validated before output is changed. On HTTP
errors, inaccessible/protected collections, or changed markup, the refresh fails
and retains the last good snapshot. The GitHub workflow therefore stops before
committing or requesting a build on such failures.

Once published to `main`, the workflow supports manual dispatch. Scheduled
refresh remains disabled until the repository variable `PIXIESET_AUTO_REFRESH`
is set to `true`; enable it only after a manual refresh succeeds. The schedule
then checks twice a day. It assumes GitHub Pages publishes from the `main` branch root, as the
static repository layout suggests; verify the actual repository Pages settings
before enabling it. It explicitly requests a Pages build because commits made
with `GITHUB_TOKEN` do not themselves trigger one. Workflow execution and Pages
permissions have not been verified in this local checkout.

For reliable unattended updates, Pixieset must allow this public feed request or
provide a supported export/API. The browser-readable website is not evidence
that a scheduled server request will be accepted. Last-good public snapshots
keep the page useful until that is resolved; removing an album from the site
requires a successful refresh or explicitly updating the snapshot.
