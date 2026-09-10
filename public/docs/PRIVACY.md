# Privacy

Lock in sends no browsing records to a server. There are no accounts, analytics, ads, remote scripts, payments, or synchronization.

Regular sessions retain task names, focus URLs, resource rules, blocked domains, deadlines, extensions, grants and domain-level attempts in browser storage. Focus URLs can contain personal document IDs or query values. Access and exit reasons are checked but not retained. At most 100 sessions and 2,000 attempts per session are retained.

Private navigation attempts are excluded. Private sessions use temporary browser storage and temporary network rules, with no saved history. Closing the browser clears them. Changing a regular session from a private window still changes that regular saved session. The extension's browser private-window permission is required.

Blocked destinations are temporarily carried in a block page fragment to support returning after a grant. The blocked page removes the fragment after reading the return destination into memory, but the browser may transiently observe the redirect URL. Reloading that page loses the temporary return destination. Attempt statistics do not save that path or query. Exports contain personal session information and should be handled as backups.

Storage and alarms maintain deadlines. Tabs, webNavigation and HTTP(S) host permissions allow destination enforcement. Declarative network rules redirect pages. The extension does not read page contents, cookies, passwords or keyboard input.

Delete history from Dashboard when inactive, or remove the extension to clear its storage. The preview stores its own separate records in localStorage; clear site data to remove those. Browser vendors' own diagnostics are outside Lock in's control.


## Firefox private-session limit (0.2.1)

Firefox private sessions are unavailable in 0.2.1 because its shared background context cannot isolate them from normal windows. Regular sessions can cover private windows with permission; private attempts remain excluded. Chromium private sessions retain their existing temporary-storage behavior.
