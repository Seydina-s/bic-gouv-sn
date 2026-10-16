import { requireOptionalNativeModule } from "expo";
import { Linking, Platform } from "react-native";
import type * as WebBrowser from "./web-browser";

export interface BrowserColours {
  /** Bar of the tab (Android). */
  toolbar: string;
  /** Its buttons (iOS). */
  controls: string;
}

/**
 * Opens an official video in a browser tab inside the app (owner's choice, 14/10/2026):
 * the video plays from the official site, and one gesture brings the reader back to
 * the article. Builds made before the module came (15/10) open the phone's browser
 * or its YouTube app instead.
 */
/**
 * True while a tab is being opened: a second tap meanwhile is ignored. On the
 * iPhone, a second tab asked for during the first one is refused with an error
 * nobody would see (audit of 15/10/2026).
 */
let opening = false;

export async function openVideo(url: string, colours: BrowserColours): Promise<void> {
  if (opening) {
    return;
  }
  opening = true;
  try {
    if (Platform.OS !== "web" && requireOptionalNativeModule("ExpoWebBrowser") !== null) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- see above
      const { openBrowserAsync } = require("./web-browser") as typeof WebBrowser;
      await openBrowserAsync(url, {
        toolbarColor: colours.toolbar,
        controlsColor: colours.controls,
        enableBarCollapsing: true,
      });
      return;
    }
    await Linking.openURL(url);
  } catch {
    // The page could not be shown: nothing else breaks, the card stays to try again.
  } finally {
    opening = false;
  }
}
