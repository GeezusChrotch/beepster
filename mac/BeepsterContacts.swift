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

let store = CNContactStore()
let arguments = CommandLine.arguments

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

guard CNContactStore.authorizationStatus(for: .contacts) == .authorized else {
    let response = LookupResponse(authorized: false, names: [:])
    let data = try JSONEncoder().encode(response)
    FileHandle.standardOutput.write(data)
    exit(0)
}

let input = FileHandle.standardInput.readDataToEndOfFile()
let request = try JSONDecoder().decode(LookupRequest.self, from: input)
let nameDescriptor = CNContactFormatter.descriptorForRequiredKeys(for: .fullName)
let keys: [CNKeyDescriptor] = [nameDescriptor, CNContactNicknameKey as CNKeyDescriptor, CNContactOrganizationNameKey as CNKeyDescriptor]
var names: [String: String] = [:]

for identifier in Set(request.identifiers) {
    let predicate: NSPredicate
    if identifier.contains("@") {
        predicate = CNContact.predicateForContacts(matchingEmailAddress: identifier)
    } else {
        predicate = CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: identifier))
    }
    if let contact = try store.unifiedContacts(matching: predicate, keysToFetch: keys).first,
       let name = displayName(contact) {
        names[identifier] = name
    }
}

let response = LookupResponse(authorized: true, names: names)
let data = try JSONEncoder().encode(response)
FileHandle.standardOutput.write(data)
