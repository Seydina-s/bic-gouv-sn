import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { createContext, useContext } from "react";
import { TextInput, type TextInputProps } from "react-native";

/** True inside the map's sliding panel. */
export const InPanel = createContext(false);

/**
 * The town search's text field: the plain one, or, inside the sliding panel, the
 * panel's own field (it keeps what is typed above the keyboard).
 */
export function FieldTextInput(props: TextInputProps) {
  return useContext(InPanel) ? <BottomSheetTextInput {...props} /> : <TextInput {...props} />;
}
