import AppKit
import Foundation

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var contactStatus: NSTextField!
    private var gatewayStatus: NSTextField!
    private var tailscaleStatus: NSTextField!
    private var refreshButton: NSButton!
    private let supportDirectory = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/Beepster")

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        let content = NSView()
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 570, height: 520),
                          styleMask: [.titled, .closable, .miniaturizable],
                          backing: .buffered, defer: false)
        window.title = "Beepster Connector"
        window.center()
        window.contentView = content

        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 14
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

        let firstButtons = buttonRow([
            button("Enable Contacts", #selector(enableContacts)),
            button("Open Privacy Settings", #selector(openPrivacySettings))
        ])
        let secondButtons = buttonRow([
            button("Set Beeper Token", #selector(setBeeperToken)),
            button("Start Private Route", #selector(startPrivateRoute))
        ])
        let thirdButtons = buttonRow([
            button("Show Pairing Code", #selector(showPairingCode)),
            button("Install Guide", #selector(openInstallGuide))
        ])
        stack.addArrangedSubview(firstButtons)
        stack.addArrangedSubview(secondButtons)
        stack.addArrangedSubview(thirdButtons)

        refreshButton = button("Run All Checks Again", #selector(refresh))
        refreshButton.bezelStyle = .rounded
        refreshButton.keyEquivalent = "\r"
        stack.addArrangedSubview(refreshButton)

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

    private func buttonRow(_ buttons: [NSButton]) -> NSStackView {
        let row = NSStackView(views: buttons)
        row.orientation = .horizontal
        row.spacing = 10
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
        if process.isRunning { process.terminate() }
        process.waitUntilExit()
        let data = output.fileHandleForReading.readDataToEndOfFile()
        return (process.terminationStatus, String(decoding: data, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines))
    }

    private func contactsAuthorization() -> String {
        let helper = supportDirectory.appendingPathComponent("bin/Beepster Contacts.app").path
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
        let candidates = ["/Applications/Tailscale.app/Contents/MacOS/Tailscale", "/opt/homebrew/bin/tailscale", "/usr/local/bin/tailscale"]
        guard let binary = candidates.first(where: FileManager.default.isExecutableFile(atPath:)) else {
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
        let helper = supportDirectory.appendingPathComponent("bin/Beepster Contacts.app").path
        DispatchQueue.global(qos: .userInitiated).async {
            _ = self.run("/usr/bin/open", ["-W", "-n", helper])
            DispatchQueue.main.async { self.refresh() }
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
        let keychain = supportDirectory.appendingPathComponent("bin/beepster-keychain").path
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
        let candidates = ["/Applications/Tailscale.app/Contents/MacOS/Tailscale", "/opt/homebrew/bin/tailscale", "/usr/local/bin/tailscale"]
        guard let binary = candidates.first(where: FileManager.default.isExecutableFile(atPath:)) else {
            openInstallGuide()
            return
        }
        DispatchQueue.global(qos: .userInitiated).async {
            _ = self.run(binary, ["serve", "--bg", "8794"])
            DispatchQueue.main.async { self.refresh() }
        }
    }

    @objc private func showPairingCode() {
        let helper = supportDirectory.appendingPathComponent("bin/beepster-keychain").path
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

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
