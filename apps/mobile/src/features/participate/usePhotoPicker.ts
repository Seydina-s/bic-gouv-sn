import { useCallback, useState } from "react";
import { imagePickerAvailable, loadImagePicker } from "./load-image-picker";

export interface PickedPhoto {
  /** To show it on the phone. */
  uri: string;
  /** To send it (JPEG, already lightened by the picker). */
  base64: string;
}

/** Compression asked of the picker: a 12 MP photo leaves at a few hundred kilobytes. */
const QUALITY = 0.6;

/**
 * One photo for a report, taken or chosen. Where the picker does not exist (a
 * test build made before Participer), `available` is false and nothing is loaded.
 */
export function usePhotoPicker() {
  const [available] = useState(imagePickerAvailable);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  const pick = useCallback(async (from: "camera" | "library") => {
    const picker = loadImagePicker();
    if (from === "camera") {
      const permission = await picker.requestCameraPermissionsAsync();
      setCameraDenied(!permission.granted);
      if (!permission.granted) {
        return;
      }
    }
    const options = {
      mediaTypes: ["images" as const],
      quality: QUALITY,
      base64: true,
      exif: false,
    };
    const result =
      from === "camera"
        ? await picker.launchCameraAsync(options)
        : await picker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset?.base64 !== undefined && asset.base64 !== null) {
      setPhoto({ uri: asset.uri, base64: asset.base64 });
    }
  }, []);

  const remove = useCallback(() => {
    setPhoto(null);
  }, []);
  return { available, photo, pick, remove, cameraDenied };
}
