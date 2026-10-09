import type { ViewStyle } from "react-native";

export const getBottomBarPadding = (bottomInset: number): ViewStyle => ({
  paddingBottom: Math.max(bottomInset, 12),
});

export const getSafeAreaTopPadding = (topInset: number): ViewStyle => ({
  paddingTop: Math.max(topInset, 0),
});
