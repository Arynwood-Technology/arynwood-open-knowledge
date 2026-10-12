# Accessibility principles
Target WCAG 2.2 AA. This milestone has not been independently audited and does not claim conformance.
[WCAG 2.2](https://www.w3.org/TR/WCAG22/) is the testing reference; use Universal Design for Learning to offer multiple ways to engage, access information and express understanding.

Implemented baseline: semantic landmarks/headings, skip link, native buttons/forms, explicit labels, status/error announcements, focus movement on views and publication details, visible focus, responsive layout, 44-pixel controls, text sizing, high contrast, reduced-motion rules, no animation dependency, and multimodal evidence descriptions from the reading pathway. Text-to-speech and visual/multimedia resources are planned; browser speech services must be reviewed for network transmission before use.

Manual release checklist: keyboard-only full workflow; clear focus/order after dynamic updates; screen-reader naming/status on NVDA/Firefox and VoiceOver/Safari; 200% text scaling and 400% zoom/reflow at 320 CSS pixels; contrast measurement in every state; forced-colors mode; reduced motion; error recovery without color alone; understandable citation/status language. Test actual WebViews separately.

Automated DOM tests exercise the primary workflow and native controls, but cannot establish screen-reader compatibility or UDL effectiveness. Include people with disabilities in usability testing using informed consent and accessible feedback. Keep reading controls available without sign-in. No timed educational task or disability-based ranking is introduced.
