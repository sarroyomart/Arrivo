export type MapPickerResult = {
  latitude: number;
  longitude: number;
  placeName: string;
};

let pendingResult: MapPickerResult | null = null;

export function setMapPickerResult(result: MapPickerResult): void {
  pendingResult = result;
}

export function consumeMapPickerResult(): MapPickerResult | null {
  const result = pendingResult;
  pendingResult = null;
  return result;
}
