import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExternalLink } from "@/components/external-link";
import { FeedRow } from "@/components/feed-row";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useFeeds } from "@/hooks/use-feeds";
import { useTheme } from "@/hooks/use-theme";
import { parseOpml } from "@/lib/parse-opml";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type PickedFile = { text: () => Promise<string> };

/**
 * Lets the user pick an OPML file. Returns null if they cancel.
 *
 * On native we use expo-file-system's own picker: it hands back a `File`
 * the app is granted read access to. Reading a document-picker cache copy
 * through `new File(uri)` fails with "Missing 'READ' permission" in
 * Expo Go, because that cache lives outside the app's scoped directories.
 */
async function pickOpmlFile(): Promise<PickedFile | null> {
  if (Platform.OS === "web") {
    const picked = await DocumentPicker.getDocumentAsync();
    const file = picked.canceled ? undefined : picked.assets[0].file;
    return file ?? null;
  }
  const picked = await File.pickFileAsync();
  return picked.canceled ? null : picked.result;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [feedUrl, setFeedUrl] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const {
    feeds,
    addFeed,
    removeFeed,
    toggleActive,
    importOpml,
    isAdding,
    addError,
  } = useFeeds();

  async function handleAddFeed(): Promise<void> {
    const url = feedUrl.trim();
    if (!url) {
      return;
    }
    const result = await addFeed(url);
    if (result.ok) {
      setFeedUrl("");
    }
  }

  async function handleImportOpml(): Promise<void> {
    let picked: PickedFile | null;
    try {
      picked = await pickOpmlFile();
    } catch (error) {
      console.warn("OPML pick failed", error);
      setImportMessage(`Couldn't open the file picker: ${errorMessage(error)}`);
      return;
    }
    if (!picked) {
      return;
    }
    setIsImporting(true);
    setImportMessage(null);
    try {
      let text: string;
      try {
        text = await picked.text();
      } catch (error) {
        console.warn("OPML read failed", error);
        setImportMessage(`Couldn't read that file: ${errorMessage(error)}`);
        return;
      }
      let entries;
      try {
        entries = parseOpml(text);
      } catch (error) {
        console.warn("OPML parse failed", error);
        setImportMessage(`That file isn't valid OPML: ${errorMessage(error)}`);
        return;
      }
      if (entries.length === 0) {
        setImportMessage("No feeds found in that file.");
        return;
      }
      const summary = await importOpml(entries);
      const parts = [
        `Added ${summary.added} feed${summary.added === 1 ? "" : "s"}`,
      ];
      if (summary.skipped > 0) {
        parts.push(`${summary.skipped} already added`);
      }
      if (summary.failed > 0) {
        parts.push(`${summary.failed} failed`);
      }
      setImportMessage(parts.join(", "));
    } catch (error) {
      console.warn("OPML import failed", error);
      setImportMessage(`Import failed: ${errorMessage(error)}`);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.topContent,
          {
            paddingTop: insets.top + Spacing.two,
            paddingBottom: insets.bottom + Spacing.three,
          },
        ]}
      >
        <ThemedView style={styles.container}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="subtitle">Settings</ThemedText>
            <ThemedText style={styles.centerText} themeColor="textSecondary">
              Add RSS Feeds below
            </ThemedText>

            <ExternalLink href="https://moss.id.au" asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView type="backgroundElement" style={styles.linkButton}>
                  <ThemedText type="link">
                    View more from the developer
                  </ThemedText>
                  <SymbolView
                    tintColor={theme.text}
                    name={{
                      ios: "arrow.up.right.square",
                      android: "link",
                      web: "link",
                    }}
                    size={12}
                  />
                </ThemedView>
              </Pressable>
            </ExternalLink>
          </ThemedView>

          <ThemedView style={styles.sectionsWrapper}>
            <ThemedText type="subtitle">RSS Feeds</ThemedText>
            <TextInput
              value={feedUrl}
              onChangeText={setFeedUrl}
              placeholder="Paste a feed or website URL"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                },
              ]}
            />
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
              onPress={handleAddFeed}
              disabled={isAdding}
            >
              <ThemedText>{isAdding ? "Adding…" : "Add"}</ThemedText>
            </Pressable>
            {addError ? (
              <ThemedText themeColor="textSecondary">{addError}</ThemedText>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.importButton,
                { borderColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
              onPress={handleImportOpml}
              disabled={isImporting}
            >
              <ThemedText>
                {isImporting ? "Importing…" : "Import OPML"}
              </ThemedText>
            </Pressable>
            {importMessage ? (
              <ThemedText themeColor="textSecondary">
                {importMessage}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.sectionsWrapper}>
            <ThemedText type="subtitle">Feeds</ThemedText>
            {feeds.length === 0 ? (
              <ThemedText themeColor="textSecondary">
                No feeds yet — add one above.
              </ThemedText>
            ) : (
              feeds.map((feed) => (
                <FeedRow
                  key={feed.id}
                  feed={feed}
                  onToggleActive={toggleActive}
                  onRemove={removeFeed}
                />
              ))
            )}
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topContent: {
    flexDirection: "row",
    justifyContent: "center",
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  centerText: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: "row",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: "center",
    gap: Spacing.one,
    alignItems: "center",
  },
  sectionsWrapper: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  input: {
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  addButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Spacing.two,
  },
  importButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
});
