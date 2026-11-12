import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useMobileAuth } from "../lib/auth-context";

export default function MobileProfileScreen() {
  const router = useRouter();
  const { user, isLoading, logout, updateProfile } = useMobileAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.profile?.fullName || "");
  const [fullNameBn, setFullNameBn] = useState(user?.profile?.fullNameBn || "");
  const [preferredLanguage, setPreferredLanguage] = useState<"bn" | "en">(
    (user?.profile?.preferredLanguage as "bn" | "en") || "bn",
  );
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Not Signed In</Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 16 }]}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.buttonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({
        fullName: fullName.trim(),
        fullNameBn: fullNameBn.trim() || undefined,
        preferredLanguage,
      });
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to log out of BDMart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Profile (প্রোফাইল)</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.phoneText}>{user.phone}</Text>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>
              {user.isPhoneVerified ? "VERIFIED" : "UNVERIFIED"}
            </Text>
          </View>
        </View>

        <Text style={styles.roleText}>
          Roles: {user.roles.join(", ")} &bull; Status: {user.status}
        </Text>

        <View style={styles.divider} />

        {!isEditing ? (
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name (English):</Text>
              <Text style={styles.infoValue}>
                {user.profile?.fullName || "Not provided"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>পূর্ণ নাম (বাংলা):</Text>
              <Text style={styles.infoValue}>
                {user.profile?.fullNameBn || "প্রদান করা হয়নি"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Language:</Text>
              <Text style={styles.infoValue}>
                {user.profile?.preferredLanguage === "bn"
                  ? "বাংলা (Bengali)"
                  : "English"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                setFullName(user.profile?.fullName || "");
                setFullNameBn(user.profile?.fullNameBn || "");
                setPreferredLanguage(
                  (user.profile?.preferredLanguage as "bn" | "en") || "bn",
                );
                setIsEditing(true);
              }}
            >
              <Text style={styles.editBtnText}>Edit Profile (সম্পাদনা)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name (English)</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>পূর্ণ নাম (বাংলা)</Text>
              <TextInput
                style={styles.input}
                value={fullNameBn}
                onChangeText={setFullNameBn}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Language (ভাষা)</Text>
              <View style={styles.langRow}>
                <TouchableOpacity
                  style={[
                    styles.langOption,
                    preferredLanguage === "bn" && styles.langOptionActive,
                  ]}
                  onPress={() => setPreferredLanguage("bn")}
                >
                  <Text
                    style={[
                      styles.langOptionText,
                      preferredLanguage === "bn" && styles.langOptionTextActive,
                    ]}
                  >
                    বাংলা
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.langOption,
                    preferredLanguage === "en" && styles.langOptionActive,
                  ]}
                  onPress={() => setPreferredLanguage("en")}
                >
                  <Text
                    style={[
                      styles.langOptionText,
                      preferredLanguage === "en" && styles.langOptionTextActive,
                    ]}
                  >
                    English
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  logoutBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutBtnText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  verifiedBadge: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    color: "#065f46",
    fontSize: 11,
    fontWeight: "700",
  },
  roleText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 16,
  },
  infoRow: {
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  editBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
  },
  langRow: {
    flexDirection: "row",
    gap: 10,
  },
  langOption: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    alignItems: "center",
  },
  langOptionActive: {
    borderColor: "#059669",
    backgroundColor: "#ecfdf5",
  },
  langOptionText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  langOptionTextActive: {
    color: "#059669",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#059669",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelBtnText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
});
