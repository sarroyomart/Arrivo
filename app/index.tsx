import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";

import { ActiveAlarmsMap } from "@/src/components/ActiveAlarmsMap";
import { AlarmCard } from "@/src/components/AlarmCard";
import { EmptyState } from "@/src/components/EmptyState";
import { FAB } from "@/src/components/FAB";
import { IconButton } from "@/src/components/IconButton";
import { SegmentedTabs } from "@/src/components/SegmentedTabs";
import { GeofenceLimitError, useAlarms } from "@/src/hooks/useAlarms";
import { usePalette } from "@/src/hooks/usePalette";
import { useTranslation } from "@/src/i18n";
import type { GeoAlarm } from "@/src/types/alarm";

type HomeTab = "map" | "list";

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const palette = usePalette();
  const { alarms, loading, error, refreshAlarms, removeAlarm, toggleAlarm } =
    useAlarms();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>("map");

  const tabs = useMemo(
    () => [
      { key: "map", label: t("tabs.map"), icon: "map-outline" },
      { key: "list", label: t("tabs.alarms"), icon: "list-outline" },
    ],
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      void refreshAlarms();
    }, [refreshAlarms]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAlarms();
    setRefreshing(false);
  }, [refreshAlarms]);

  const handleToggle = useCallback(
    async (alarm: GeoAlarm, isActive: boolean) => {
      try {
        await toggleAlarm(alarm.id, isActive);
      } catch (caught) {
        if (caught instanceof GeofenceLimitError) {
          Alert.alert(t("geofenceLimit.title"), t("geofenceLimit.body"));
        }
      }
    },
    [t, toggleAlarm],
  );

  const handleDelete = useCallback(
    (alarm: GeoAlarm) => {
      Alert.alert(
        t("alarm.deleteConfirmTitle"),
        t("alarm.deleteConfirmMessage", { title: alarm.title }),
        [
          { text: t("buttons.cancel"), style: "cancel" },
          {
            text: t("buttons.delete"),
            style: "destructive",
            onPress: () => {
              void removeAlarm(alarm.id);
            },
          },
        ],
      );
    },
    [removeAlarm, t],
  );

  const goToNew = useCallback(() => {
    router.push("/alarm/new");
  }, [router]);

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen
        options={{
          title: t("screens.home.title"),
          headerRight: () => (
            <IconButton
              icon="information-circle-outline"
              variant="container"
              accessibilityLabel={t("a11y.settings")}
              onPress={() => router.push("/onboarding")}
            />
          ),
        }}
      />

      <View className="bg-canvas px-space-4 pb-space-3 pt-space-2">
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as HomeTab)}
        />
      </View>

      {activeTab === "map" ? (
        <ActiveAlarmsMap alarms={alarms} />
      ) : loading && alarms.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : alarms.length === 0 ? (
        <>
          <EmptyState
            title={t("empty.title")}
            body={t("empty.body")}
            cta={t("empty.cta")}
            onPressCta={goToNew}
          />
          <FAB accessibilityLabel={t("a11y.newAlarm")} onPress={goToNew} />
        </>
      ) : (
        <>
          <FlatList
            className="flex-1"
            data={alarms}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-space-4 pb-space-16 pt-space-3"
            ItemSeparatorComponent={() => <View className="h-space-3" />}
            ListHeaderComponent={
              <View className="mb-space-3">
                <Text className="typo-body text-muted">
                  {t("screens.home.subtitle")}
                </Text>
                {error && !(error instanceof GeofenceLimitError) ? (
                  <Text className="typo-caption mt-space-2 text-danger">
                    {t("errors.loadAlarms")}
                  </Text>
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <AlarmCard
                alarm={item}
                onPress={() => router.push(`/alarm/${item.id}`)}
                onToggle={(isActive) => {
                  void handleToggle(item, isActive);
                }}
                onDelete={() => handleDelete(item)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void handleRefresh();
                }}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            }
          />
          <FAB accessibilityLabel={t("a11y.newAlarm")} onPress={goToNew} />
        </>
      )}
    </View>
  );
}
