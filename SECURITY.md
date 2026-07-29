# Security Policy

## Supported Versions

Security fixes are made for the current `main` branch and the latest published
Lesscroll release only. Fixes are not backported to older releases or forks.

| Version | Supported |
| --- | --- |
| Current `main` and latest published release | Yes |
| Older releases, modified builds, and forks | No |

Chrome 120 is the extension's manifest minimum. Users should run a Chrome
version that still receives vendor security updates.

## Reporting a Vulnerability

Please report vulnerabilities privately by emailing
[lesscroll@nemvik.com](mailto:lesscroll@nemvik.com) with the subject
`[SECURITY] Lesscroll`. Do not open a public issue.

Include:

- the affected release or commit;
- Chrome and operating-system versions;
- the security or privacy impact;
- minimal reproducible steps or a small proof of concept;
- a suggested fix, if known.

Use synthetic data where possible. Do not send passwords, cookies, private page
content, or real browsing history. Test only systems and data you own or have
permission to use, and avoid disrupting the public website or other users.

This is a hobby project with no bug bounty or guaranteed response or remediation
time. I aim to acknowledge reports within seven days and will coordinate
disclosure with the reporter.

## System and Scope

Lesscroll is a Chrome Manifest V3 extension and a separate public informational
website. The extension has no account, backend, cloud sync, analytics, telemetry,
advertising, or external API integration.

This policy covers the extension source and release package, build and packaging
configuration, and reachable code under `site/`.

## Threat Model and Trust Boundaries

The protected assets are locally stored browsing rules and usage state, granted
host permissions, privileged extension execution, release integrity, and public
website content.

The background service worker is the privileged component and the only writer
to `chrome.storage.local`. Bundled extension pages and the isolated overlay are
trusted callers. Page URLs, hostnames, page DOM, stored values before parsing,
runtime message payloads, public-site requests, and report attachments are
untrusted inputs.

Lesscroll relies on Chrome's Manifest V3 isolation and permission enforcement,
the security of the user's operating system and Chrome profile, and the
integrity of the Chrome Web Store and website hosting platform.

## Security Invariants

- Extension browsing data remains local and is not transmitted to the website,
  developer, or a third party.
- The extension contains no remote executable code, analytics, advertising, or
  telemetry.
- Host access requires an explicit user action and is limited to normalized HTTP
  and HTTPS origins represented by enabled saved rules.
- The extension does not require `tabs`, `<all_urls>`, or required host access.
- Stored state and runtime messages are validated before privileged use.
- State mutations are serialized through the background service worker.
- Page-controlled values are rendered with DOM text operations, not
  `innerHTML`, `eval`, or dynamic code execution.
- Malformed input or restricted pages must not widen permissions, export data,
  or corrupt the serialized background queue.
- The public website does not receive extension data.

## Reportable Findings

Reports should demonstrate a reachable impact in a supported version, such as:

- unauthorized disclosure or transmission of local browsing or usage data;
- code execution or privileged extension actions originating from an untrusted
  webpage or external sender;
- host access granted or widened without the user's explicit choice;
- bypass of runtime-message or stored-state validation that changes privileged
  state;
- remote-code loading or release-artifact tampering;
- a reachable website vulnerability with concrete confidentiality, integrity,
  availability, or privacy impact.

Dependency advisories are reportable when the vulnerable behavior is reachable
in the shipped extension or deployed website.

## Out of Scope and Known Limitations

Lesscroll is a behavioral reminder, not an access-control or website-blocking
tool. Avoiding or dismissing the interruption without another security or
privacy impact is out of scope.

Also out of scope are timing-accuracy bugs without security or privacy impact,
modified or forked builds, local changes made through browser developer tools,
and compromise of the user's operating system or Chrome profile.

`chrome.storage.local` is not application-level encrypted; it relies on the
local browser-profile and operating-system boundary. Chrome, the Chrome Web
Store, and the website hosting/CDN platform are external trust dependencies.
