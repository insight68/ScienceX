---
name: scansci-pdf
version: "1.14.0"
description: >
  Search academic literature, validate DOI or arXiv identifiers, export
  citations, organize paper lists, or retrieve papers through configured
  open-access, publisher, or authorized institutional routes.
metadata:
  upstream: https://github.com/Rimagination/scansci-pdf
  upstream-commit: "be3a990e0fd49075d2697d5f0e9d624a0dc31ec7"
  license: Apache-2.0
---

# ScanSci PDF

Use the `scansci-pdf` MCP server for paper discovery, metadata, citations,
download queues, access diagnostics, and result reporting.

## Availability

Do not assume the external ScanSci runtime or its MCP tools are installed.

- When `scansci_pdf_*` tools are available, use the MCP route below.
- Otherwise, check whether the `scansci-pdf` CLI is available before invoking it.
- If neither route exists, explain that the bundled Skill is present but the
  optional ScanSci runtime is not configured. Ask before installing packages,
  opening a browser, or changing MCP configuration.
- Never claim a paper was retrieved unless the tool or CLI returned a concrete
  output path and source.

This Skill is adapted from
[`Rimagination/scansci-pdf`](https://github.com/Rimagination/scansci-pdf),
version 1.14.0 at commit `be3a990e0fd49075d2697d5f0e9d624a0dc31ec7`
under Apache-2.0. ScienceX bundles these declarative instructions, not the
third-party Python runtime or optional browser, proxy, Tor, and institutional
access dependencies. Follow the upstream installation instructions for the
user's operating system, then configure its MCP server with command
`scansci-pdf` and argument `run`.

## Route by intent

- Search or identify papers: `scansci_pdf_search`,
  `scansci_pdf_verify_identifiers`, and `scansci_pdf_parse_list` for list files.
- Resolve open-access locations:
  `scansci_pdf_prepare_queue(action="resolve_oa")`.
- Download one paper: `scansci_pdf_download` with an explicit strategy when the
  user has a source preference.
- Process a list: `scansci_pdf_parse_list` or
  `scansci_pdf_batch_download`. Show the normalized queue and obtain
  confirmation before starting a large batch.
- Export citations: `scansci_pdf_citation`; push to Zotero only when the user
  requests it via `scansci_pdf_zotero_push`.
- Diagnose setup or access: `scansci_pdf_diagnostics` with
  `check=health|network|sources|setup`.

When only the CLI is available, use its matching `search`, `get`, `batch`,
`check`, and citation commands. Inspect `scansci-pdf --help` for the installed
version instead of assuming the upstream command surface has not changed.

## Operating boundaries

- Preserve the user's requested source strategy and report the actual source in
  every download result.
- When no source preference is given, use `legal_only`: prefer open-access,
  publisher API, and institution-authorized routes.
- Ask before opening an interactive login, importing cookies, configuring an
  institutional route, storing an API key, or changing proxy/access settings.
- Treat API keys, cookies, proxy credentials, and institution details as
  secrets; never repeat them in the response.
- Gray-source and anti-bot routes require the user's explicit choice and must be
  used only where the user has the right to do so and applicable rules permit
  it. Do not enable them as a fallback from `legal_only`.
- Search results are candidates, not verified citations. Validate identifiers
  and clearly label missing, ambiguous, inaccessible, and failed records.
