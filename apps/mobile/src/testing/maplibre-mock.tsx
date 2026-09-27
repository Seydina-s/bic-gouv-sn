// Stand-in for the native map library in tests, where its native module does not
// exist: the same components, drawn as plain views, with the camera and the source
// of points recording what the screen asks of them.
import { type ReactNode, type Ref, useImperativeHandle } from "react";
import { View, type ViewProps } from "react-native";

/** What the screen asked of the camera and of the points, for assertions. */
export const mapCalls = {
  camera: { flyTo: jest.fn(), easeTo: jest.fn() },
  source: { getClusterExpansionZoom: jest.fn(() => Promise.resolve(16)) },
};

/** Forget what earlier tests asked. */
export function clearMapCalls(): void {
  mapCalls.camera.flyTo.mockClear();
  mapCalls.camera.easeTo.mockClear();
  mapCalls.source.getClusterExpansionZoom.mockClear();
}

interface MapStandInProps extends ViewProps {
  mapStyle: string;
  onPress?: () => void;
  onDidFailLoadingMap?: () => void;
  children?: ReactNode;
}

export function Map({
  mapStyle,
  onPress,
  onDidFailLoadingMap,
  children,
  ...view
}: MapStandInProps) {
  // The handlers stay on the view so tests can fire them as map events.
  return (
    <View {...view} {...({ mapStyle, onPress, onDidFailLoadingMap } as ViewProps)}>
      {children}
    </View>
  );
}

export function Camera({ ref }: { ref?: Ref<unknown> }) {
  useImperativeHandle(ref, () => mapCalls.camera);
  return null;
}

export function GeoJSONSource({
  ref,
  data,
  onPress,
  children,
}: {
  ref?: Ref<unknown>;
  data: unknown;
  onPress?: (event: unknown) => void;
  children?: ReactNode;
}) {
  useImperativeHandle(ref, () => mapCalls.source);
  return (
    <View testID="service-points" {...({ data, onPress } as ViewProps)}>
      {children}
    </View>
  );
}

export function Layer() {
  return null;
}

export function NativeUserLocation() {
  return <View testID="user-location" />;
}
