import AppKit
import Foundation
import Security

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow!
    private var contactStatus: NSTextField!
    private var gatewayStatus: NSTextField!
    private var tailscaleStatus: NSTextField!
    private var setupSummary: NSTextField!
    private var setupButton: NSButton!
    private var connectPhoneButton: NSButton!
    private var refreshButton: NSButton!
    private var advancedStack: NSStackView!
    private var advancedToggle: NSButton!
    private let supportDirectory = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/Beepster")
    private var launchAgentURL: URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Library/LaunchAgents/org.beepster.gateway.plist")
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        let content = NSView()
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 640, height: 610),
                          styleMask: [.titled, .closable, .miniaturizable],
                          backing: .buffered, defer: false)
        window.title = "Beepster Connector"
        window.center()
        window.contentView = content

        let stack = NSStackView()
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 13
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
        let intro = wrappingLabel("One guided setup keeps your Pebble connected to Beeper through this Mac. No Terminal required.")
        intro.textColor = .secondaryLabelColor
        stack.addArrangedSubview(intro)
        let runningNote = wrappingLabel("You can close this window after setup. Keep Beeper Desktop open and Tailscale connected; Beepster’s background service keeps working.")
        runningNote.font = .systemFont(ofSize: 13, weight: .medium)
        runningNote.textColor = .systemBlue
        stack.addArrangedSubview(runningNote)

        setupSummary = wrappingLabel("Checking your setup…")
        setupSummary.font = .systemFont(ofSize: 18, weight: .semibold)
        stack.addArrangedSubview(setupSummary)

        contactStatus = statusRow("Contact names")
        gatewayStatus = statusRow("Beeper connection")
        tailscaleStatus = statusRow("Private connection")
        [contactStatus, gatewayStatus, tailscaleStatus].forEach(stack.addArrangedSubview)

        let actionsTitle = NSTextField(labelWithString: "Get started")
        actionsTitle.font = .systemFont(ofSize: 17, weight: .semibold)
        stack.addArrangedSubview(actionsTitle)

        setupButton = button("Set Up Beepster", #selector(setUpBeepster))
        setupButton.keyEquivalent = "\r"
        setupButton.bezelStyle = .rounded
        setupButton.controlSize = .large
        connectPhoneButton = button("Connect Phone", #selector(connectPhone))
        refreshButton = button("Test Everything", #selector(refresh))
        let mainActions = [
            primaryActionRow(setupButton,
                             description: "Installs or repairs the Mac service, connects Beeper, requests Contacts access, starts the private route, and checks the result."),
            primaryActionRow(connectPhoneButton,
                             description: "Copies the private address and shows the pairing code together with short phone instructions."),
            primaryActionRow(refreshButton,
                             description: "Checks Contacts, the live Beeper connection, and the private phone route in one pass.")
        ]
        for row in mainActions {
            stack.addArrangedSubview(row)
            row.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }

        advancedToggle = NSButton(title: "Advanced options", target: self, action: #selector(toggleAdvanced))
        advancedToggle.setButtonType(.pushOnPushOff)
        advancedToggle.bezelStyle = .disclosure
        stack.addArrangedSubview(advancedToggle)

        advancedStack = NSStackView()
        advancedStack.orientation = .vertical
        advancedStack.alignment = .leading
        advancedStack.spacing = 8
        advancedStack.isHidden = true
        let advancedActions = [
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
            actionRow(button("Install Guide", #selector(openInstallGuide)),
                      what: "Opens the complete step-by-step installation guide.",
                      why: "Provides exact repair instructions when a readiness check needs attention.")
        ]
        for row in advancedActions {
            advancedStack.addArrangedSubview(row)
            row.widthAnchor.constraint(equalTo: advancedStack.widthAnchor).isActive = true
        }
        stack.addArrangedSubview(advancedStack)
        advancedStack.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true

        let footer = wrappingLabel("Your Beeper token stays in Keychain and is never sent to the phone or watch.")
        footer.textColor = .secondaryLabelColor
        footer.font = .systemFont(ofSize: 12)
        stack.addArrangedSubview(footer)

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        refresh()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
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

    private func primaryActionRow(_ button: NSButton, description: String) -> NSStackView {
        button.widthAnchor.constraint(equalToConstant: 160).isActive = true
        let explanation = wrappingLabel(description)
        explanation.font = .systemFont(ofSize: 13)
        explanation.textColor = .secondaryLabelColor
        let row = NSStackView(views: [button, explanation])
        row.orientation = .horizontal
        row.alignment = .centerY
        row.spacing = 14
        explanation.setContentHuggingPriority(.defaultLow, for: .horizontal)
        return row
    }

    private func actionRow(_ button: NSButton, what: String, why: String) -> NSStackView {
        button.widthAnchor.constraint(equalToConstant: 160).isActive = true
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

    private func setWorking(_ working: Bool, message: String) {
        setupButton?.isEnabled = !working
        connectPhoneButton?.isEnabled = !working
        refreshButton?.isEnabled = !working
        setupSummary?.stringValue = message
        setupSummary?.textColor = working ? .secondaryLabelColor : .labelColor
    }

    @objc private func toggleAdvanced() {
        let showing = advancedToggle.state == .on
        advancedStack.isHidden = !showing
        let oldFrame = window.frame
        let newHeight: CGFloat = showing ? 780 : 610
        window.setFrame(NSRect(x: oldFrame.origin.x,
                               y: oldFrame.maxY - newHeight,
                               width: oldFrame.width,
                               height: newHeight), display: true, animate: true)
    }

    private func run(_ executable: String, _ arguments: [String], input: String? = nil, timeout: TimeInterval? = 8) -> (Int32, String) {
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
        if let timeout {
            let deadline = Date().addingTimeInterval(timeout)
            while process.isRunning && Date() < deadline { Thread.sleep(forTimeInterval: 0.05) }
            if process.isRunning {
                process.terminate()
                let terminationDeadline = Date().addingTimeInterval(1)
                while process.isRunning && Date() < terminationDeadline { Thread.sleep(forTimeInterval: 0.05) }
                if process.isRunning { kill(process.processIdentifier, SIGKILL) }
            }
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
        guard !dnsName.isEmpty, let servePort = tailscaleServePort(binary) else { return nil }
        var components = URLComponents()
        components.scheme = "https"
        components.host = dnsName
        if servePort != 443 { components.port = servePort }
        components.path = "/configure"
        return components.url
    }

    private func tailscaleServePort(_ binary: String) -> Int? {
        let status = run(binary, ["serve", "status", "--json"])
        guard status.0 == 0,
              let data = status.1.data(using: .utf8),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let web = root["Web"] as? [String: Any] else { return nil }
        for (listener, value) in web {
            guard let configuration = value as? [String: Any],
                  let handlers = configuration["Handlers"] as? [String: Any] else { continue }
            for value in handlers.values {
                guard let handler = value as? [String: Any],
                      let proxy = handler["Proxy"] as? String,
                      let proxyURL = URL(string: proxy),
                      ["127.0.0.1", "localhost"].contains(proxyURL.host ?? ""),
                      proxyURL.port == 8794,
                      let separator = listener.lastIndex(of: ":"),
                      let port = Int(listener[listener.index(after: separator)...]) else { continue }
                return port
            }
        }
        return nil
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
        // The first read may wait while macOS presents a Keychain authorization
        // dialog. Let that request finish so we never orphan the dialog.
        if run(helper, ["get", account], timeout: nil).0 == 0 { return true }
        guard let secret = value(), !secret.isEmpty else { return false }
        return run(helper, ["set", account], input: secret, timeout: nil).0 == 0
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
            try replaceInstalledItem(contacts, at: installedContacts)
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
        let launched = run("/usr/bin/open", ["-n", helper, "--args", "--status-file", statusFile.path])
        guard launched.0 == 0 else { return "unknown" }
        let deadline = Date().addingTimeInterval(5)
        while Date() < deadline {
            if let value = try? String(contentsOf: statusFile, encoding: .utf8)
                .trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty {
                return value
            }
            Thread.sleep(forTimeInterval: 0.05)
        }
        return "unknown"
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
        return tailscaleServePort(binary) != nil
            ? (true, "connected and forwarding")
            : (false, "connected; Serve route missing")
    }

    private func beeperConnectionHealth() -> (Bool, String) {
        let gateway = gatewayHealth()
        guard gateway.0 else { return gateway }
        let secret = run(keychainHelperPath(), ["get", "gateway-token"], timeout: nil)
        guard secret.0 == 0, !secret.1.isEmpty,
              let url = URL(string: "http://127.0.0.1:8794/v1/chats?limit=1") else {
            return (false, "private credential unavailable")
        }
        let semaphore = DispatchSemaphore(value: 0)
        var result = (false, "could not load conversations")
        var request = URLRequest(url: url, timeoutInterval: 8)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("Bearer \(secret.1)", forHTTPHeaderField: "Authorization")
        URLSession.shared.dataTask(with: request) { _, response, _ in
            defer { semaphore.signal() }
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                result = (true, "connected; conversations available")
            }
        }.resume()
        _ = semaphore.wait(timeout: .now() + 9)
        return result
    }

    private func privateRouteHealth() -> (Bool, String) {
        let tailscale = tailscaleHealth()
        guard tailscale.0, var components = phoneSetupURL().flatMap({ URLComponents(url: $0, resolvingAgainstBaseURL: false) }) else {
            return tailscale
        }
        components.path = "/health"
        guard let url = components.url else { return (false, "private address unavailable") }
        let semaphore = DispatchSemaphore(value: 0)
        var result = (false, "route did not reach Beepster")
        var request = URLRequest(url: url, timeoutInterval: 6)
        request.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: request) { data, response, _ in
            defer { semaphore.signal() }
            guard let http = response as? HTTPURLResponse, http.statusCode == 200,
                  let data,
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  object["ok"] as? Bool == true,
                  object["service"] as? String == "beepster-gateway" else { return }
            result = (true, "connected; phone route verified")
        }.resume()
        _ = semaphore.wait(timeout: .now() + 7)
        return result
    }

    private func performChecks() -> (contacts: String, gateway: (Bool, String), route: (Bool, String)) {
        (contactsAuthorization(), beeperConnectionHealth(), privateRouteHealth())
    }

    private func showCheckResults(_ checks: (contacts: String, gateway: (Bool, String), route: (Bool, String))) {
        let contactsOK = checks.contacts == "authorized"
        setStatus(contactStatus, ok: contactsOK, name: "Contact names",
                  detail: contactsOK ? "enabled" : "permission needs attention")
        setStatus(gatewayStatus, ok: checks.gateway.0, name: "Beeper connection", detail: checks.gateway.1)
        setStatus(tailscaleStatus, ok: checks.route.0, name: "Private connection", detail: checks.route.1)
        if contactsOK && checks.gateway.0 && checks.route.0 {
            setWorking(false, message: "Everything on this Mac is ready")
        } else {
            setWorking(false, message: "Setup needs attention")
        }
    }

    @objc private func refresh() {
        setWorking(true, message: "Testing Contacts, Beeper, and the private connection…")
        [contactStatus, gatewayStatus, tailscaleStatus].forEach {
            $0?.stringValue = "○  Checking…"
            $0?.textColor = .secondaryLabelColor
        }
        DispatchQueue.global(qos: .userInitiated).async {
            let checks = self.performChecks()
            DispatchQueue.main.async {
                self.showCheckResults(checks)
            }
        }
    }

    @objc private func setUpBeepster() {
        setWorking(true, message: "Installing the Mac service…")
        DispatchQueue.global(qos: .userInitiated).async {
            let installed = self.installBundledService()
            guard installed.0 else {
                DispatchQueue.main.async {
                    self.setWorking(false, message: "Setup needs attention")
                    let alert = NSAlert()
                    alert.messageText = "Beepster could not finish setup"
                    alert.informativeText = installed.1
                    alert.runModal()
                }
                return
            }
            let tokenExists = self.run(self.keychainHelperPath(), ["get", "beeper-access-token"], timeout: nil).0 == 0
            DispatchQueue.main.async {
                if tokenExists {
                    self.continueGuidedSetup(token: nil, tokenWasAlreadyStored: true)
                } else if let token = self.promptForBeeperToken() {
                    self.continueGuidedSetup(token: token, tokenWasAlreadyStored: false)
                } else {
                    self.continueGuidedSetup(token: nil, tokenWasAlreadyStored: false)
                }
            }
        }
    }

    private func promptForBeeperToken() -> String? {
        let alert = NSAlert()
        alert.messageText = "Connect Beeper Desktop"
        alert.informativeText = "Create a dedicated token in Beeper Desktop’s API settings, then paste it here. Beepster stores it only in your Mac login Keychain."
        alert.addButton(withTitle: "Save and Continue")
        alert.addButton(withTitle: "Skip for Now")
        let field = NSSecureTextField(frame: NSRect(x: 0, y: 0, width: 360, height: 24))
        field.placeholderString = "Beeper Desktop API token"
        alert.accessoryView = field
        window.makeFirstResponder(field)
        guard alert.runModal() == .alertFirstButtonReturn else { return nil }
        let token = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        field.stringValue = ""
        return token.isEmpty ? nil : token
    }

    private func continueGuidedSetup(token: String?, tokenWasAlreadyStored: Bool) {
        setWorking(true, message: "Finishing setup and checking the result…")
        DispatchQueue.global(qos: .userInitiated).async {
            var tokenReady = tokenWasAlreadyStored
            if let token {
                tokenReady = self.run(self.keychainHelperPath(), ["set", "beeper-access-token"], input: token, timeout: nil).0 == 0
            }

            var contacts = self.contactsAuthorization()
            if contacts == "not_determined" {
                _ = self.run("/usr/bin/open", ["-W", "-n", self.contactsHelperPath()], timeout: nil)
                contacts = self.contactsAuthorization()
            }

            var tailscaleConnected = false
            var tailscaleReady = false
            if let binary = self.tailscaleBinary() {
                tailscaleConnected = self.run(binary, ["status"]).0 == 0
            }
            if let binary = self.tailscaleBinary(), tailscaleConnected {
                _ = self.run(binary, ["serve", "--bg", "8794"])
                tailscaleReady = self.tailscaleHealth().0
            }

            _ = self.run("/bin/launchctl", ["kickstart", "-k", "gui/\(getuid())/org.beepster.gateway"])
            let deadline = Date().addingTimeInterval(8)
            var gateway = self.beeperConnectionHealth()
            while !gateway.0 && Date() < deadline {
                Thread.sleep(forTimeInterval: 0.35)
                gateway = self.beeperConnectionHealth()
            }
            let route = self.privateRouteHealth()
            let checks = (contacts: contacts, gateway: gateway, route: route)

            DispatchQueue.main.async {
                self.showCheckResults(checks)
                if contacts == "authorized" && gateway.0 && route.0 {
                    self.setupSummary.stringValue = "Mac setup complete — connect your phone next"
                } else {
                    var issues: [String] = []
                    if !tokenReady { issues.append("Add the dedicated Beeper Desktop token.") }
                    if contacts != "authorized" { issues.append("Allow Contacts access so names can be shown.") }
                    if !tailscaleConnected {
                        issues.append("Open Tailscale on this Mac and sign in, then run setup again.")
                    } else if !tailscaleReady {
                        issues.append("Tailscale is connected. Select Start Private Route under Advanced options.")
                    } else if !route.0 {
                        issues.append("The Serve route exists but did not reach Beepster. Select Test Everything to retry.")
                    }
                    if tokenReady && !gateway.0 { issues.append("Keep Beeper Desktop open and signed in.") }
                    let alert = NSAlert()
                    alert.messageText = "One more step is needed"
                    alert.informativeText = issues.isEmpty ? "Open Advanced options for repair tools." : issues.joined(separator: "\n")
                    alert.runModal()
                }
            }
        }
    }

    @objc private func enableContacts() {
        let helper = contactsHelperPath()
        DispatchQueue.global(qos: .userInitiated).async {
            // This helper now runs an AppKit lifecycle, so -W reliably waits
            // for the user to finish the macOS permission sheet.
            _ = self.run("/usr/bin/open", ["-W", "-n", helper], timeout: nil)
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
            let stored = self.run(keychain, ["set", "beeper-access-token"], input: token, timeout: nil)
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

    @objc private func connectPhone() {
        setWorking(true, message: "Preparing phone setup…")
        DispatchQueue.global(qos: .userInitiated).async {
            let route = self.privateRouteHealth()
            let url = route.0 ? self.phoneSetupURL() : nil
            let pairing = self.run(self.keychainHelperPath(), ["get", "pairing-code"], timeout: nil)
            DispatchQueue.main.async {
                self.setWorking(false, message: route.0 ? "Phone setup is ready" : "Setup needs attention")
                guard let url, pairing.0 == 0, !pairing.1.isEmpty else {
                    let alert = NSAlert()
                    alert.messageText = "Phone setup is not ready yet"
                    alert.informativeText = route.1 == "not connected"
                        ? "Open Tailscale and sign in, then try again."
                        : (route.1 == "connected; Serve route missing"
                            ? "Tailscale is connected. Select Start Private Route under Advanced options, then try again."
                            : "Select Test Everything to identify the remaining setup problem.")
                    alert.runModal()
                    return
                }

                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(url.absoluteString, forType: .string)

                let instructions = self.wrappingLabel("1. On your phone, open Pebble → Beepster → Settings.\n2. Paste the private address (already copied).\n3. Enter the pairing code, then test and save.")
                instructions.font = .systemFont(ofSize: 13)
                let addressLabel = NSTextField(labelWithString: "Private address")
                addressLabel.font = .systemFont(ofSize: 12, weight: .semibold)
                let address = NSTextField(frame: NSRect(x: 0, y: 0, width: 440, height: 24))
                address.stringValue = url.absoluteString
                address.isEditable = false
                address.isSelectable = true
                address.lineBreakMode = .byTruncatingMiddle
                let codeLabel = NSTextField(labelWithString: "Pairing code: \(pairing.1)")
                codeLabel.font = .monospacedDigitSystemFont(ofSize: 20, weight: .semibold)
                let details = NSStackView(views: [instructions, addressLabel, address, codeLabel])
                details.orientation = .vertical
                details.alignment = .leading
                details.spacing = 8
                details.widthAnchor.constraint(equalToConstant: 440).isActive = true

                let alert = NSAlert()
                alert.messageText = "Connect Beepster on your phone"
                alert.informativeText = "Everything you need is together here. The address is on your clipboard."
                alert.accessoryView = details
                alert.addButton(withTitle: "Done")
                alert.runModal()
            }
        }
    }

    @objc private func copyPhoneSetup() {
        guard tailscaleHealth().0, let url = phoneSetupURL() else {
            let alert = NSAlert()
            alert.messageText = "Private setup address unavailable"
            let tailscale = tailscaleHealth()
            alert.informativeText = tailscale.1 == "not connected"
                ? "Open Tailscale and sign in, then try again."
                : "Tailscale is connected. Select Start Private Route under Advanced options, then try again."
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
        let value = run(helper, ["get", "pairing-code"], timeout: nil).1
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
