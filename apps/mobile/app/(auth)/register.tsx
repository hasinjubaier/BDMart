import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMobileAuth } from "../../lib/auth-context";

export default function MobileRegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; otp?: string }>();
  const phone = params.phone || "";
  const otp = params.otp || "";

  const { register } = useMobileAuth();

  const [fullName, setFullName] = useState("");
  const [fullNameBn, setFullNameBn] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"bn" | "en">("bn");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    try {
      setLoading(true);
      await register({
        phone,
        otp,
        fullName: fullName.trim(),
        fullNameBn: fullNameBn.trim() || undefined,
        email: email.trim() || undefined,
        preferredLanguage,
      });

      router.replace("/profile");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Verified Phone: <Text style={{ fontWeight: "700" }}>{phone}</Text>
          </Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name (English) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mohammad Rahim"
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>পূর্ণ নাম (বাংলা - ঐচ্ছিক)</Text>
            <TextInput
              style={styles.input}
              placeholder="যেমন: মোহাম্মদ রহিম"
              value={fullNameBn}
              onChangeText={setFullNameBn}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="rahim@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Language (ভাষা)</Text>
            <View style={styles.langRow}>
              <TouchableOpacity
                style={[
                  styles.langBtn,
                  preferredLanguage === "bn" && styles.langBtnActive,
                ]}
                onPress={() => setPreferredLanguage("bn")}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    preferredLanguage === "bn" && styles.langBtnTextActive,
                  ]}
                >
                  বাংলা (Bengali)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langBtn,
                  preferredLanguage === "en" && styles.langBtnActive,
                ]}
                onPress={() => setPreferredLanguage("en")}
              >
                <Text
                  style={[
                    styles.langBtnText,
                    preferredLanguage === "en" && styles.langBtnTextActive,
                  ]}
                >
                  English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>
                Complete Registration (নিবন্ধন)
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#f87171",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#991b1b",
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 16,
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
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  langRow: {
    flexDirection: "row",
    gap: 10,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    alignItems: "center",
  },
  langBtnActive: {
    borderColor: "#059669",
    backgroundColor: "#ecfdf5",
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  langBtnTextActive: {
    color: "#059669",
  },
  button: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
