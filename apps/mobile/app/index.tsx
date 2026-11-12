import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useMobileAuth } from "../lib/auth-context";

export default function MobileHomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useMobileAuth();

  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <Text style={styles.flagIcon}>🇧🇩</Text>
        <Text style={styles.title}>BDMart Mobile</Text>
        <Text style={styles.tagline}>
          Bangladesh-First B2B + B2C Commerce Marketplace
        </Text>
        <Text style={styles.description}>
          Connecting manufacturers, wholesalers, retailers, and consumers across
          Bangladesh with unified phone authentication.
        </Text>
      </View>

      <View style={styles.actionSection}>
        {isLoading ? (
          <ActivityIndicator color="#059669" size="large" />
        ) : user ? (
          <View style={styles.userCard}>
            <Text style={styles.welcomeText}>
              Welcome back,{"\n"}
              <Text style={styles.userName}>
                {user.profile?.fullName || user.phone}
              </Text>
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/profile")}
            >
              <Text style={styles.primaryButtonText}>Go to My Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestSection}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/(auth)/login")}
            >
              <Text style={styles.primaryButtonText}>
                Sign In with Phone (লগইন)
              </Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              Secure OTP login &bull; No password required
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Milestone 2: Authentication & Identity &bull; Expo SDK 58
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
    padding: 24,
  },
  heroSection: {
    alignItems: "center",
    marginTop: 60,
  },
  flagIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
    marginTop: 6,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 20,
    maxWidth: 320,
  },
  actionSection: {
    marginVertical: 40,
    width: "100%",
  },
  userCard: {
    backgroundColor: "#f9fafb",
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  guestSection: {
    width: "100%",
  },
  primaryButton: {
    backgroundColor: "#059669",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  termsText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 12,
  },
  footer: {
    alignItems: "center",
    marginBottom: 10,
  },
  footerText: {
    fontSize: 11,
    color: "#9ca3af",
  },
});
