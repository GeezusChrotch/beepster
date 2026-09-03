import AppKit
import Foundation
import Security

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var contactStatus: NSTextField!
    private var gatewayStatus: NSTextField!
    private var tailscaleStatus: NSTextField!
    private var refreshButton: NSButton!
    private let supportDirectory = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/Beepster")
    private var launchAgentURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/LaunchAgents/org.beepster.gateway.plist")
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        let content = NSView()
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 680, height: 700),
                          styleMask: [.titled, .closable, .miniaturizable],
                          backing: .buffered, defer: false)
        window.title = "Beepster Connector"
        window.center()
        window.contentView = content

        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 11
        stack.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -28),
            stack.topAnchor.constraint(equalTo: content.topAnchor, constant: 25)
        ])

        let title = NSTextField(labelWithString: "Beepster Connector")
        title.font = .systemFont(ofSize: 25, weight: .bold)
        stack.addArrangedSubview(title)
        let intro = wrappingLabel("Keeps your Pebble connected to Beeper through this Mac. Message data stays on your Mac, phone, watch, and private Tailscale connection.")
        intro.textColor = .secondaryLabelColor
        stack.addArrangedSubview(intro)

        contactStatus = statusRow("Contacts")
        gatewayStatus = statusRow("Gateway and Beeper")
        tailscaleStatus = statusRow("Private Tailscale route")
        [contactStatus, gatewayStatus, tailscaleStatus].forEach(stack.addArrangedSubview)

        let actionsTitle = NSTextField(labelWithString: "Setup actions — use top to bottom")
        actionsTitle.font = .systemFont(ofSize: 18, weight: .semibold)
        stack.addArrangedSubview(actionsTitle)

        refreshButton = button("Run All Checks Again", #selector(refresh))
        refreshButton.keyEquivalent = "\r"
        let actions = [
            actionRow(button("Install or Repair", #selector(installBackgroundService)),
                      what: "Installs the bundled gateway and keeps it running after login.",
                      why: "Completes the Mac installation without Node, npm, Git, or Terminal."),
            actionRow(button("Set Beeper Token", #selector(setBeeperToken)),
                      what: "Stores a dedicated Beeper Desktop API token in Keychain.",
                      why: "The local gateway needs it to read conversations and send replies."),
            actionRow(button("Enable Contacts", #selector(enableContacts)),
                      what: "Requests read-only access to your Mac contacts.",
                      why: "Lets Apple conversations show names instead of email addresses or phone numbers."),
            actionRow(button("Open Privacy Settings", #selector(openPrivacySettings)),
                      what: "Opens macOS directly to the Contacts privacy controls.",
                      why: "Use this if access was previously denied or you want to review it."),
            actionRow(button("Start Private Route", #selector(startPrivateRoute)),
                      what: "Starts Tailscale Serve for the local Beepster gateway.",
                      why: "Gives your phone private HTTPS access without exposing Beepster publicly."),
            actionRow(button("Copy Phone Setup", #selector(copyPhoneSetup)),
                      what: "Copies this Mac's private Beepster Settings address.",
                      why: "Paste it once in Beepster Settings in the Pebble mobile app."),
            actionRow(button("Show Pairing Code", #selector(showPairingCode)),
                      what: "Displays the current one-time six-digit pairing code.",
                      why: "Lets the phone receive its narrow gateway credential without revealing the Beeper token."),
            actionRow(refreshButton,
                      what: "Rechecks every status shown above.",
                      why: "Confirms that the complete Mac-to-watch path is ready now."),
            actionRow(button("Install Guide", #selector(openInstallGuide)),
                      what: "Opens the complete step-by-step installation guide.",
                      why: "Provides exact repair instructions when a readiness check needs attention.")
        ]
        for row in actions {
            stack.addArrangedSubview(row)
            row.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }

        let footer = wrappingLabel("If a check fails, the Install Guide includes exact repair steps. Beepster never displays or copies your Beeper or gateway tokens.")
        footer.textColor = .secondaryLabelColor
        footer.font = .systemFont(ofSize: 12)
        stack.addArrangedSubview(footer)

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        refresh()
    }

    private func wrappingLabel(_ text: String) -> NSTextField {
        let label = NSTextField(wrappingLabelWithString: text)
        label.maximumNumberOfLines = 0
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return label
    }

    private func statusRow(_ name: String) -> NSTextField {
        let label = wrappingLabel("○  \(name): Checking…")
        label.font = .systemFont(ofSize: 16, weight: .medium)
        return label
    }

    private func button(_ title: String, _ action: Selector) -> NSButton {
        let result = NSButton(title: title, target: self, action: action)
        result.bezelStyle = .rounded
        return result
    }

    private func actionRow(_ button: NSButton, what: String, why: String) -> NSStackView {
        button.widthAnchor.constraint(equalToConstant: 175).isActive = true
        let explanation = wrappingLabel("What: \(what)\nWhy: \(why)")
        explanation.font = .systemFont(ofSize: 12.5)
        explanation.textColor = .secondaryLabelColor
        let row = NSStackView(views: [button, explanation])
        row.orientation = .horizontal
        row.alignment = .centerY
        row.spacing = 14
        explanation.setContentHuggingPriority(.defaultLow, for: .horizontal)
        return row
    }

    private func setStatus(_ label: NSTextField, ok: Bool, name: String, detail: String) {
        label.stringValue = "\(ok ? "●" : "⚠")  \(name): \(detail)"
        label.textColor = ok ? .systemGreen : .systemOrange
    }

    private func run(_ executable: String, _ arguments: [String], input: String? = nil, timeout: TimeInterval = 8) -> (Int32, String) {
        let process = Process()
        let output = Pipe()
        let inputPipe = Pipe()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments
        process.standardOutput = output
        process.standardError = output
        if input != nil { process.standardInput = inputPipe }
        do { try process.run() } catch { return (-1, error.localizedDescription) }
        if let input {
            inputPipe.fileHandleForWriting.write(Data(input.utf8))
            try? inputPipe.fileHandleForWriting.close()
        }
        let deadline = Date().addingTimeInterval(timeout)
        while process.isRunning && Date() < deadline { Thread.sleep(forTimeInterval: 0.05) }
        if process.isRunning {
            process.terminate()
            let terminationDeadline = Date().addingTimeInterval(1)
            while process.isRunning && Date() < terminationDeadline { Thread.sleep(forTimeInterval: 0.05) }
            if process.isRunning { kill(process.processIdentifier, SIGKILL) }
        }
        process.waitUntilExit()
        let data = output.fileHandleForReading.readDataToEndOfFile()
        return (process.terminationStatus, String(decoding: data, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines))
    }

    private func bundledResource(_ name: String) -> URL? {
        guard let url = Bundle.main.resourceURL?.appendingPathComponent(name),
              FileManager.default.fileExists(atPath: url.path) else { return nil }
        return url
    }

    private func tailscaleBinary() -> String? {
        ["/Applications/Tailscale.app/Contents/MacOS/Tailscale", "/opt/homebrew/bin/tailscale", "/usr/local/bin/tailscale"]
            .first(where: FileManager.default.isExecutableFile(atPath:))
    }

    private func phoneSetupURL() -> URL? {
        guard let binary = tailscaleBinary() else { return nil }
        let status = run(binary, ["status", "--json"])
        guard status.0 == 0,
              let data = status.1.data(using: .utf8),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let ownDevice = root["Self"] as? [String: Any],
              var dnsName = ownDevice["DNSName"] as? String else { return nil }
        dnsName = dnsName.trimmingCharacters(in: CharacterSet(charactersIn: "."))
        guard !dnsName.isEmpty else { return nil }
        return URL(string: "https://\(dnsName)/configure")
    }

    private func keychainHelperPath() -> String {
        let installed = supportDirectory.appendingPathComponent("bin/beepster-keychain")
        return FileManager.default.fileExists(atPath: installed.path)
            ? installed.path : (bundledResource("beepster-keychain")?.path ?? installed.path)
    }

    private func contactsHelperPath() -> String {
        let installed = supportDirectory.appendingPathComponent("bin/Beepster Contacts.app")
        return FileManager.default.fileExists(atPath: installed.path)
            ? installed.path : (bundledResource("Beepster Contacts.app")?.path ?? installed.path)
    }

    private func currentNodeResource() -> URL? {
#if arch(arm64)
        return bundledResource("node-arm64")
#else
        return bundledResource("node-x64")
#endif
    }

    private func randomHex(byteCount: Int) -> String? {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else { return nil }
        return bytes.map { String(format: "%02x", $0) }.joined()
    }

    private func ensureSecret(_ account: String, value: @autoclosure () -> String?) -> Bool {
        let helper = supportDirectory.appendingPathComponent("bin/beepster-keychain").path
        if run(helper, ["get", account]).0 == 0 { return true }
        guard let secret = value(), !secret.isEmpty else { return false }
        return run(helper, ["set", account], input: secret).0 == 0
    }

    fileprivate func installBundledService() -> (Bool, String) {
        let manager = FileManager.default
        guard let node = currentNodeResource(),
              let gateway = bundledResource("gateway"),
              let keychain = bundledResource("beepster-keychain"),
              let contacts = bundledResource("Beepster Contacts.app") else {
            return (false, "This development build does not contain the standalone gateway resources.")
        }
        let bin = supportDirectory.appendingPathComponent("bin")
        let logs = supportDirectory.appendingPathComponent("logs")
        let installedGateway = supportDirectory.appendingPathComponent("gateway")
        do {
            try manager.createDirectory(at: bin, withIntermediateDirectories: true)
            try manager.createDirectory(at: logs, withIntermediateDirectories: true)
            try manager.createDirectory(at: launchAgentURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            try replaceInstalledItem(node, at: bin.appendingPathComponent("node"))
            try replaceInstalledItem(gateway, at: installedGateway)
            let installedKeychain = bin.appendingPathComponent("beepster-keychain")
            if !manager.fileExists(atPath: installedKeychain.path) {
                try manager.copyItem(at: keychain, to: installedKeychain)
            }
            let installedContacts = bin.appendingPathComponent("Beepster Contacts.app")
            if !manager.fileExists(atPath: installedContacts.path) {
                try manager.copyItem(at: contacts, to: installedContacts)
            }
            try manager.setAttributes([.posixPermissions: 0o755], ofItemAtPath: bin.appendingPathComponent("node").path)
            try manager.setAttributes([.posixPermissions: 0o755], ofItemAtPath: installedKeychain.path)

            guard ensureSecret("gateway-token", value: randomHex(byteCount: 32)) else {
                return (false, "Could not create the private gateway credential.")
            }
            var pairingBytes = [UInt8](repeating: 0, count: 4)
            guard SecRandomCopyBytes(kSecRandomDefault, pairingBytes.count, &pairingBytes) == errSecSuccess else {
                return (false, "Could not create a pairing code.")
            }
            let randomValue = pairingBytes.reduce(UInt32(0)) { ($0 << 8) | UInt32($1) }
            guard ensureSecret("pairing-code", value: String(100000 + randomValue % 900000)) else {
                return (false, "Could not store the one-time pairing code.")
            }

            let plist: [String: Any] = [
                "Label": "org.beepster.gateway",
                "ProgramArguments": [bin.appendingPathComponent("node").path,
                                     installedGateway.appendingPathComponent("src/cli.js").path],
                "WorkingDirectory": installedGateway.path,
                "EnvironmentVariables": [
                    "BEEPSTER_PORT": "8794",
                    "BEEPSTER_KEYCHAIN_HELPER": bin.appendingPathComponent("beepster-keychain").path,
                    "BEEPSTER_CONTACT_HELPER": bin.appendingPathComponent("Beepster Contacts.app").path
                ],
                "RunAtLoad": true,
                "KeepAlive": true,
                "StandardOutPath": logs.appendingPathComponent("gateway.log").path,
                "StandardErrorPath": logs.appendingPathComponent("gateway-error.log").path
            ]
            let previousLaunchAgent = try? Data(contentsOf: launchAgentURL)
            let plistData = try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0)
            try plistData.write(to: launchAgentURL, options: .atomic)
            try manager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: launchAgentURL.path)
            _ = run("/bin/launchctl", ["bootout", "gui/\(getuid())/org.beepster.gateway"])
            let started = run("/bin/launchctl", ["bootstrap", "gui/\(getuid())", launchAgentURL.path])
            guard started.0 == 0 else {
                if let previousLaunchAgent {
                    try? previousLaunchAgent.write(to: launchAgentURL, options: .atomic)
                    _ = run("/bin/launchctl", ["bootstrap", "gui/\(getuid())", launchAgentURL.path])
                }
                return (false, "The new background gateway could not be started; the previous service was restored.")
            }
            return (true, "The background service is installed and will start at login.")
        } catch {
            return (false, error.localizedDescription)
        }
    }

    private func replaceInstalledItem(_ source: URL, at destination: URL) throws {
        let manager = FileManager.default
        let parent = destination.deletingLastPathComponent()
        let nonce = UUID().uuidString
        let staged = parent.appendingPathComponent(".\(destination.lastPathComponent).new-\(nonce)")
        let backup = parent.appendingPathComponent(".\(destination.lastPathComponent).old-\(nonce)")
        try manager.copyItem(at: source, to: staged)
        do {
            if manager.fileExists(atPath: destination.path) {
                try manager.moveItem(at: destination, to: backup)
            }
            try manager.moveItem(at: staged, to: destination)
            if manager.fileExists(atPath: backup.path) { try? manager.removeItem(at: backup) }
        } catch {
            if !manager.fileExists(atPath: destination.path), manager.fileExists(atPath: backup.path) {
                try? manager.moveItem(at: backup, to: destination)
            }
            try? manager.removeItem(at: staged)
            throw error
        }
    }

    private func contactsAuthorization() -> String {
        let helper = contactsHelperPath()
        guard FileManager.default.fileExists(atPath: helper) else { return "helper_missing" }
        let statusFile = FileManager.default.temporaryDirectory
            .appendingPathComponent("beepster-contacts-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: statusFile) }
        _ = run("/usr/bin/open", ["-W", "-n", helper, "--args", "--status-file", statusFile.path])
        return (try? String(contentsOf: statusFile, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)) ?? "unknown"
    }

    private func gatewayHealth() -> (Bool, String) {
        guard let url = URL(string: "http://127.0.0.1:8794/health") else { return (false, "invalid local address") }
        let semaphore = DispatchSemaphore(value: 0)
        var result = (false, "not running")
        var request = URLRequest(url: url, timeoutInterval: 4)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: request) { data, response, _ in
            defer { semaphore.signal() }
            guard let http = response as? HTTPURLResponse, http.statusCode == 200,
                  let data, let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  object["ok"] as? Bool == true else { return }
            result = object["beeperConfigured"] as? Bool == true
                ? (true, "running; Beeper token configured")
                : (false, "running; Beeper token missing")
        }.resume()
        _ = semaphore.wait(timeout: .now() + 5)
        return result
    }

    private func tailscaleHealth() -> (Bool, String) {
        guard let binary = tailscaleBinary() else {
            return (false, "Tailscale not found")
        }
        let status = run(binary, ["status"])
        guard status.0 == 0 else { return (false, "not connected") }
        let serve = run(binary, ["serve", "status"])
        let routed = serve.1.contains("127.0.0.1:8794") || serve.1.contains("localhost:8794")
        return routed ? (true, "connected and forwarding") : (false, "connected; Serve route missing")
    }

    @objc private func refresh() {
        refreshButton?.isEnabled = false
        [contactStatus, gatewayStatus, tailscaleStatus].forEach {
            $0?.stringValue = "○  Checking…"
            $0?.textColor = .secondaryLabelColor
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let contacts = self.contactsAuthorization()
            let gateway = self.gatewayHealth()
            let tailscale = self.tailscaleHealth()
            DispatchQueue.main.async {
                self.setStatus(self.contactStatus, ok: contacts == "authorized", name: "Contacts",
                               detail: contacts == "authorized" ? "read-only access enabled" : "permission needs attention")
                self.setStatus(self.gatewayStatus, ok: gateway.0, name: "Gateway and Beeper", detail: gateway.1)
                self.setStatus(self.tailscaleStatus, ok: tailscale.0, name: "Private Tailscale route", detail: tailscale.1)
                self.refreshButton.isEnabled = true
            }
        }
    }

    @objc private func enableContacts() {
        let helper = contactsHelperPath()
        DispatchQueue.global(qos: .userInitiated).async {
            _ = self.run("/usr/bin/open", ["-W", "-n", helper])
            DispatchQueue.main.async { self.refresh() }
        }
    }

    @objc private func installBackgroundService() {
        DispatchQueue.global(qos: .userInitiated).async {
            let result = self.installBundledService()
            DispatchQueue.main.async {
                let alert = NSAlert()
                alert.messageText = result.0 ? "Background service ready" : "Installation needs attention"
                alert.informativeText = result.1
                alert.runModal()
                self.refresh()
            }
        }
    }

    @objc private func openPrivacySettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Contacts") {
            NSWorkspace.shared.open(url)
        }
    }

    @objc private func setBeeperToken() {
        let alert = NSAlert()
        alert.messageText = "Set dedicated Beeper token"
        alert.informativeText = "Paste the token created in Beeper Desktop. It will be stored in your login Keychain and is never displayed again."
        alert.addButton(withTitle: "Save Token")
        alert.addButton(withTitle: "Cancel")
        let field = NSSecureTextField(frame: NSRect(x: 0, y: 0, width: 360, height: 24))
        field.placeholderString = "Beeper Desktop API token"
        alert.accessoryView = field
        window.makeFirstResponder(field)
        guard alert.runModal() == .alertFirstButtonReturn else { return }
        let token = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        field.stringValue = ""
        guard !token.isEmpty else { return }
        let keychain = keychainHelperPath()
        DispatchQueue.global(qos: .userInitiated).async {
            let stored = self.run(keychain, ["set", "beeper-access-token"], input: token)
            _ = self.run("/bin/launchctl", ["kickstart", "-k", "gui/\(getuid())/org.beepster.gateway"])
            DispatchQueue.main.async {
                if stored.0 != 0 {
                    let failure = NSAlert()
                    failure.messageText = "Token could not be stored"
                    failure.informativeText = "Reinstall the companion, then try again."
                    failure.runModal()
                }
                self.refresh()
            }
        }
    }

    @objc private func startPrivateRoute() {
        guard let binary = tailscaleBinary() else {
            if let url = URL(string: "https://tailscale.com/download/mac") {
                NSWorkspace.shared.open(url)
            }
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            _ = self.run(binary, ["serve", "--bg", "8794"])
            DispatchQueue.main.async { self.refresh() }
        }
    }

    @objc private func copyPhoneSetup() {
        guard tailscaleHealth().0, let url = phoneSetupURL() else {
            let alert = NSAlert()
            alert.messageText = "Private setup address unavailable"
            alert.informativeText = "Connect Tailscale and select Start Private Route, then try again."
            alert.runModal()
            return
        }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(url.absoluteString, forType: .string)
        let alert = NSAlert()
        alert.messageText = "Phone setup address copied"
        alert.informativeText = "On your phone, open Pebble → Beepster → Settings and paste the address. If Universal Clipboard is unavailable, the selectable address is shown below. Keep it private."
        let address = NSTextField(frame: NSRect(x: 0, y: 0, width: 430, height: 24))
        address.stringValue = url.absoluteString
        address.isEditable = false
        address.isSelectable = true
        address.lineBreakMode = .byTruncatingMiddle
        alert.accessoryView = address
        alert.runModal()
    }

    @objc private func showPairingCode() {
        let helper = keychainHelperPath()
        let value = run(helper, ["get", "pairing-code"]).1
        let alert = NSAlert()
        alert.messageText = value.isEmpty ? "Pairing code unavailable" : "Pairing code: \(value)"
        alert.informativeText = value.isEmpty
            ? "Reinstall the companion to generate a new one-time code."
            : "Enter this one-time code in Beepster Settings on your phone."
        alert.runModal()
    }

    @objc private func openInstallGuide() {
        if let url = URL(string: "https://github.com/GeezusChrotch/beepster/blob/main/docs/INSTALL.md") {
            NSWorkspace.shared.open(url)
        }
    }
}

if CommandLine.arguments.contains("--install-background-service") {
    let installer = AppDelegate()
    let result = installer.installBundledService()
    FileHandle.standardOutput.write(Data("\(result.0 ? "PASS" : "FAIL")  \(result.1)\n".utf8))
    exit(result.0 ? 0 : 1)
} else {
    let app = NSApplication.shared
    let delegate = AppDelegate()
    app.delegate = delegate
    app.run()
}
