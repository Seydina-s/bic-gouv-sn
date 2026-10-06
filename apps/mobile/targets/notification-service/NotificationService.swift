import UserNotifications

/// Adds the article's photo to the notification of a new article (AUD5-07). The API
/// sends the address of the cover JPEG in the notification's data ("imageUrl");
/// Expo's own rich content key is read as a fallback. Without a photo, or if it
/// cannot be downloaded in time, the notification is shown as it came.
final class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    bestAttempt = request.content.mutableCopy() as? UNMutableNotificationContent
    guard let content = bestAttempt, let url = imageURL(in: request.content.userInfo) else {
      deliver(request.content)
      return
    }
    URLSession.shared.downloadTask(with: url) { [weak self] location, _, _ in
      if let location = location, let attachment = Self.attachment(from: location) {
        content.attachments = [attachment]
      }
      self?.deliver(content)
    }.resume()
  }

  /// The system is about to stop the extension: show what we have.
  override func serviceExtensionTimeWillExpire() {
    if let content = bestAttempt {
      deliver(content)
    }
  }

  /// Hands the notification over once, whichever comes first: the photo or the deadline.
  private func deliver(_ content: UNNotificationContent) {
    guard let handler = contentHandler else {
      return
    }
    contentHandler = nil
    handler(content)
  }

  /// The photo's address: our data first, then Expo's rich content. HTTPS only.
  private func imageURL(in userInfo: [AnyHashable: Any]) -> URL? {
    let body = userInfo["body"] as? [String: Any]
    let rich = (userInfo["_richContent"] as? [String: Any]) ?? (body?["_richContent"] as? [String: Any])
    let address = (body?["imageUrl"] as? String) ?? (userInfo["imageUrl"] as? String) ?? (rich?["image"] as? String)
    guard let address = address, let url = URL(string: address), url.scheme == "https" else {
      return nil
    }
    return url
  }

  /// The downloaded photo as an attachment (iOS needs a file with an image extension).
  private static func attachment(from location: URL) -> UNNotificationAttachment? {
    let file = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent(UUID().uuidString)
      .appendingPathExtension("jpg")
    do {
      try FileManager.default.moveItem(at: location, to: file)
      return try UNNotificationAttachment(identifier: "cover", url: file, options: nil)
    } catch {
      return nil
    }
  }
}
