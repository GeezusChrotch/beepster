# Contacts helper transport

The gateway supports two transports selected by `BEEPSTER_CONTACT_HELPER`:

- Unset, or a path ending in `.app`: the existing DMG transport. The default is
  `~/Library/Application Support/Beepster/bin/Beepster Contacts.app`. The gateway
  launches the app using LaunchServices and exchanges private temporary JSON files.
- An absolute executable path: direct execution, intended for the Store Connector's
  bundled, sandbox-inheriting Contacts helper. No shell, LaunchServices, or temporary
  request/response files are used in this mode.

The executable is invoked with `--lookup`. Standard input contains
`{"identifiers":["person@example.com"]}` and is closed after the JSON request.
Identifiers are never passed as command-line arguments. Standard output must be a
single JSON response using the existing `LookupResponse` schema:
`authorized`, `names`, `contactKeys`, and optional `errorDomain`/`errorCode`.
Diagnostics must not be mixed into standard output.

Direct execution has an eight-second timeout and a 256 KiB output limit. Failed
execution, invalid JSON, timeout, or denied permission leaves Beeper's labels as
the fallback; the gateway does not request permission itself. The Store Connector
owns the Contacts permission UI and supplies the signed inherited helper's
absolute executable path. This transport does not grant or bypass sandbox or
Contacts permissions.

The environment variable is trusted local configuration, not a gateway request
parameter. Never accept a helper executable path from a remote client.
