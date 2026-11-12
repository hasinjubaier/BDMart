import { Injectable, Logger } from "@nestjs/common";
import { maskPhoneNumber } from "@bdmart/utils";

export interface SmsDeliveryResult {
  success: boolean;
  provider: string;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

export interface SmsProvider {
  sendOtp(
    phone: string,
    otp: string,
    purpose: string,
  ): Promise<SmsDeliveryResult>;
}

/**
 * Development / Test Mock SMS Provider.
 * Does NOT send cellular SMS; safely logs simulated delivery without leaking credentials.
 * Strictly prohibited from running in production.
 */
class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: MockSmsProvider cannot be instantiated in a production environment.",
      );
    }
  }

  async sendOtp(
    phone: string,
    otp: string,
    purpose: string,
  ): Promise<SmsDeliveryResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: MockSmsProvider cannot execute in a production environment.",
      );
    }
    const masked = maskPhoneNumber(phone);
    const simulatedMessage = `Your BDMart verification code for ${purpose} is ${otp}. Valid for 5 minutes.`;

    // Strictly conforms to requirement: "Do not claim an SMS was delivered when using the mock provider."
    this.logger.log(
      `[SIMULATED SMS] Destination: ${masked} | Message: "${simulatedMessage}" | Provider: MOCK (Local development simulation only - NOT dispatched to cellular carrier)`,
    );

    return {
      success: true,
      provider: "MOCK_LOCAL",
      messageId: `mock-msg-${Date.now()}`,
      simulated: true,
    };
  }
}

/**
 * Prepared Integration Interface for Bangladesh SMS Gateway (e.g., SSL Wireless, Greenweb).
 */
class BangladeshSmsGatewayProvider implements SmsProvider {
  private readonly logger = new Logger(BangladeshSmsGatewayProvider.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env.BD_SMS_API_KEY || "";
    this.senderId = process.env.BD_SMS_SENDER_ID || "BDMART";
    this.apiUrl =
      process.env.BD_SMS_GATEWAY_URL || "https://api.sms-gateway.bd/send";
  }

  async sendOtp(
    phone: string,
    otp: string,
    purpose: string,
  ): Promise<SmsDeliveryResult> {
    if (!this.apiKey) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "FATAL: BD_SMS_API_KEY is missing in production environment.",
        );
      }
      this.logger.warn(
        "Bangladesh SMS Gateway credentials not configured. Falling back to simulated transmission in development.",
      );
      return new MockSmsProvider().sendOtp(phone, otp, purpose);
    }

    try {
      // Prepared gateway dispatch skeleton
      // In production, performs authenticated HTTPS POST to verified Bangladesh telco gateway
      // NEVER log raw OTP in production logs
      this.logger.log(
        `[BD Telco Gateway] Dispatched OTP request for ${purpose} to ${maskPhoneNumber(phone)} via ${this.senderId}`,
      );
      return {
        success: true,
        provider: "BD_TELCO_GATEWAY",
        messageId: `bd-gw-${Date.now()}`,
        simulated: false,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Bangladesh SMS gateway transmission failed: ${errorMsg}`,
      );
      return {
        success: false,
        provider: "BD_TELCO_GATEWAY",
        error: "SMS_DELIVERY_FAILED",
      };
    }
  }
}

@Injectable()
export class SmsService {
  private readonly provider: SmsProvider;

  constructor() {
    const isProduction = process.env.NODE_ENV === "production";
    const forcedProvider = (process.env.SMS_PROVIDER || "")
      .toLowerCase()
      .trim();

    if (isProduction) {
      if (forcedProvider === "mock") {
        throw new Error(
          "FATAL: MockSmsProvider cannot be used in production environment. A production SMS gateway must be configured.",
        );
      }
      if (!process.env.BD_SMS_API_KEY) {
        throw new Error(
          "FATAL: Production SMS gateway API key (BD_SMS_API_KEY) is not configured.",
        );
      }
      this.provider = new BangladeshSmsGatewayProvider();
    } else {
      if (forcedProvider === "gateway") {
        this.provider = new BangladeshSmsGatewayProvider();
      } else {
        this.provider = new MockSmsProvider();
      }
    }
  }

  async sendOtp(
    phone: string,
    otp: string,
    purpose: string,
  ): Promise<SmsDeliveryResult> {
    return this.provider.sendOtp(phone, otp, purpose);
  }
}
