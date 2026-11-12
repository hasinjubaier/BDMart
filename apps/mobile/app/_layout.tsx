import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MobileAuthProvider } from "../lib/auth-context";

export default function RootLayout() {
  return (
    <MobileAuthProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#059669" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "BDMart",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(auth)/login"
          options={{
            title: "Sign In",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="(auth)/verify-otp"
          options={{
            title: "Verify OTP",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="(auth)/register"
          options={{
            title: "Register Account",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: "My Profile",
            headerBackTitle: "Home",
          }}
        />
      </Stack>
    </MobileAuthProvider>
  );
}
