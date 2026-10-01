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

type Progress = (pack: unknown, status: { state: string; percentage: number }) => void;

/** Offline areas asked for, with the callbacks the map library would call. */
export const offlineRequests: { options: { metadata?: unknown }; progress: Progress }[] = [];

export const OfflineManager = {
  getPacks: jest.fn(() => Promise.resolve([] as { id: string; metadata: object }[])),
  deletePack: jest.fn(() => Promise.resolve()),
  createPack: jest.fn((options: { metadata?: unknown }, progress: Progress) => {
    offlineRequests.push({ options, progress });
    return Promise.resolve({ id: "pack-test" });
  }),
};

/** Forget what earlier tests asked. */
export function clearMapCalls(): void {
  mapCalls.camera.flyTo.mockClear();
  mapCalls.camera.easeTo.mockClear();
  mapCalls.source.getClusterExpansionZoom.mockClear();
  OfflineManager.createPack.mockClear();
  offlineRequests.length = 0;
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

/** The marker images given to the map, by name. */
export function Images({ images }: { images: Record<string, unknown> }) {
  return <View testID="map-images" accessibilityHint={Object.keys(images).sort().join(",")} />;
}

export function NativeUserLocation() {
  return <View testID="user-location" />;
}
