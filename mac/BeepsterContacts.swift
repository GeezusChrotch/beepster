import Contacts
import Foundation

struct LookupRequest: Decodable {
    let identifiers: [String]
}

struct LookupResponse: Encodable {
    let authorized: Bool
    let names: [String: String]
}

func authorizationLabel(_ status: CNAuthorizationStatus) -> String {
    switch status {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "not_determined"
    @unknown default: return "unknown"
    }
}

func requestAuthorization(store: CNContactStore) -> (Bool, Error?) {
    if CNContactStore.authorizationStatus(for: .contacts) == .authorized { return (true, nil) }
    if CNContactStore.authorizationStatus(for: .contacts) != .notDetermined { return (false, nil) }
    let semaphore = DispatchSemaphore(value: 0)
    var granted = false
    var authorizationError: Error?
    store.requestAccess(for: .contacts) { allowed, error in
        granted = allowed
        authorizationError = error
        semaphore.signal()
    }
    semaphore.wait()
    return (granted, authorizationError)
}

func displayName(_ contact: CNContact) -> String? {
    if let name = CNContactFormatter.string(from: contact, style: .fullName)?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty {
        return name
    }
    let nickname = contact.nickname.trimmingCharacters(in: .whitespacesAndNewlines)
    if !nickname.isEmpty { return nickname }
    let organization = contact.organizationName.trimmingCharacters(in: .whitespacesAndNewlines)
    return organization.isEmpty ? nil : organization
}

func normalizeIdentifier(_ value: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.contains("@") {
        return trimmed.replacingOccurrences(of: "^mailto:", with: "", options: [.regularExpression, .caseInsensitive]).lowercased()
    }
    let digits = trimmed.filter(\.isNumber)
    guard digits.count >= 7 else { return nil }
    return digits.count == 11 && digits.first == "1" ? String(digits.dropFirst()) : digits
}

let store = CNContactStore()
let arguments = CommandLine.arguments

if let statusIndex = arguments.firstIndex(of: "--status-file"), arguments.count > statusIndex + 1 {
    try authorizationLabel(CNContactStore.authorizationStatus(for: .contacts)).write(
        toFile: arguments[statusIndex + 1], atomically: true, encoding: .utf8)
    exit(0)
}

if arguments.contains("--status") {
    print(authorizationLabel(CNContactStore.authorizationStatus(for: .contacts)))
    exit(0)
}

if !arguments.contains("--lookup") && !arguments.contains("--status") {
    let (granted, error) = requestAuthorization(store: store)
    if let error { FileHandle.standardError.write(Data("\(error)\n".utf8)) }
    print(granted ? "authorized" : authorizationLabel(CNContactStore.authorizationStatus(for: .contacts)))
    exit(granted ? 0 : 1)
}

let fileLookupIndex = arguments.firstIndex(of: "--lookup-file")
let input: Data
let outputPath: String?
if let fileLookupIndex, arguments.count > fileLookupIndex + 2 {
    input = try Data(contentsOf: URL(fileURLWithPath: arguments[fileLookupIndex + 1]))
    outputPath = arguments[fileLookupIndex + 2]
} else {
    input = FileHandle.standardInput.readDataToEndOfFile()
    outputPath = nil
}

guard CNContactStore.authorizationStatus(for: .contacts) == .authorized else {
    let data = try JSONEncoder().encode(LookupResponse(authorized: false, names: [:]))
    if let outputPath { try data.write(to: URL(fileURLWithPath: outputPath), options: .atomic) }
    else { FileHandle.standardOutput.write(data) }
    exit(0)
}

let request = try JSONDecoder().decode(LookupRequest.self, from: input)
let nameDescriptor = CNContactFormatter.descriptorForRequiredKeys(for: .fullName)
let keys: [CNKeyDescriptor] = [nameDescriptor, CNContactNicknameKey as CNKeyDescriptor,
    CNContactOrganizationNameKey as CNKeyDescriptor, CNContactEmailAddressesKey as CNKeyDescriptor,
    CNContactPhoneNumbersKey as CNKeyDescriptor]
var names: [String: String] = [:]
let requested = Set(request.identifiers.compactMap(normalizeIdentifier))
let fetchRequest = CNContactFetchRequest(keysToFetch: keys)

try store.enumerateContacts(with: fetchRequest) { contact, _ in
    guard let name = displayName(contact) else { return }
    let identifiers = contact.emailAddresses.compactMap { normalizeIdentifier($0.value as String) } +
        contact.phoneNumbers.compactMap { normalizeIdentifier($0.value.stringValue) }
    for identifier in identifiers where requested.contains(identifier) {
        names[identifier] = name
    }
}

let response = LookupResponse(authorized: true, names: names)
let data = try JSONEncoder().encode(response)
if let outputPath { try data.write(to: URL(fileURLWithPath: outputPath), options: .atomic) }
else { FileHandle.standardOutput.write(data) }
