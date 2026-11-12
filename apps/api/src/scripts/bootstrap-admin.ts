import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import bcryptjs from "bcryptjs";
import { normalizeBangladeshPhone } from "@bdmart/utils";
import { PrismaService } from "../prisma/prisma.service.js";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiDir = path.resolve(__dirname, "../..");
const explicitApiEnv = path.join(apiDir, ".env");
if (existsSync(explicitApiEnv)) {
  config({ path: explicitApiEnv });
} else {
  config();
}

export interface BootstrapAdminOptions {
  phone: string;
  fullName: string;
  email?: string;
  password?: string;
  bootstrapSecret?: string;
}

export async function bootstrapAdministrator(options: BootstrapAdminOptions) {
  const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!configuredSecret) {
    throw new Error(
      "FATAL: ADMIN_BOOTSTRAP_SECRET must be configured in environment to bootstrap an administrator.",
    );
  }

  if (options.bootstrapSecret && options.bootstrapSecret !== configuredSecret) {
    throw new Error(
      "FATAL: Provided bootstrap secret does not match ADMIN_BOOTSTRAP_SECRET.",
    );
  }

  const prisma = new PrismaService();
  prisma.onModuleInit();

  try {
    const normalizedPhone = normalizeBangladeshPhone(options.phone);

    // 1. Ensure PLATFORM_ADMIN role exists
    const adminRole = await prisma.client.role.upsert({
      where: { code: "PLATFORM_ADMIN" },
      update: {},
      create: {
        code: "PLATFORM_ADMIN",
        name: "Platform Administrator",
        description:
          "Full administrative access across BDMart marketplace platform",
      },
    });

    // 2. Ensure basic administrative permissions exist
    const permissions = [
      { code: "users.manage", module: "IAM" },
      { code: "roles.manage", module: "IAM" },
      { code: "sellers.verify", module: "ONBOARDING" },
      { code: "platform.audit", module: "AUDIT" },
    ];

    for (const p of permissions) {
      const perm = await prisma.client.permission.upsert({
        where: { code: p.code },
        update: {},
        create: { code: p.code, module: p.module },
      });

      await prisma.client.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      });
    }

    // 3. Hash password if provided
    let passwordHash: string | null = null;
    if (options.password) {
      passwordHash = await bcryptjs.hash(options.password, 12);
    }

    // 4. Create or update the admin user
    let user = await prisma.client.user.findUnique({
      where: { phone: normalizedPhone },
      include: { profile: true, userRoles: true },
    });

    if (!user) {
      user = await prisma.client.user.create({
        data: {
          phone: normalizedPhone,
          email: options.email ? options.email.toLowerCase().trim() : null,
          passwordHash,
          status: "ACTIVE",
          isPhoneVerified: true,
          isEmailVerified: Boolean(options.email),
          profile: {
            create: {
              fullName: options.fullName,
              preferredLanguage: "en",
            },
          },
          userRoles: {
            create: {
              roleId: adminRole.id,
              scopeType: "PLATFORM",
            },
          },
        },
        include: { profile: true, userRoles: true },
      });
    } else {
      // Assign PLATFORM_ADMIN role if not already assigned
      const hasRole = user.userRoles.some((ur) => ur.roleId === adminRole.id);
      if (!hasRole) {
        await prisma.client.userRole.create({
          data: {
            userId: user.id,
            roleId: adminRole.id,
            scopeType: "PLATFORM",
          },
        });
      }

      if (passwordHash) {
        await prisma.client.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            status: "ACTIVE",
            isPhoneVerified: true,
          },
        });
      }
    }

    // 5. Record security audit event
    await prisma.client.accountSecurityEvent.create({
      data: {
        userId: user.id,
        eventType: "ADMIN_BOOTSTRAPPED",
        metadata: JSON.stringify({
          phone: normalizedPhone,
          role: "PLATFORM_ADMIN",
          email: options.email || null,
        }),
      },
    });

    console.log(
      `[SUCCESS] Platform Administrator successfully provisioned: ${normalizedPhone} (${user.id})`,
    );
    return user;
  } finally {
    await prisma.onModuleDestroy();
  }
}

// Standalone CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const prefix = `--${name}=`;
    const found = args.find((a) => a.startsWith(prefix));
    return found ? found.substring(prefix.length) : undefined;
  };

  const phone = getArg("phone");
  const fullName = getArg("name") || "Platform Administrator";
  const email = getArg("email");
  const password = getArg("password");
  const secret = getArg("secret") || process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!phone) {
    console.error(
      "Usage: tsx src/scripts/bootstrap-admin.ts --phone=017XXXXXXXX [--name='Admin Name'] [--email='admin@bdmart.com'] [--password='secret'] [--secret='bootstrap-secret']",
    );
    process.exit(1);
  }

  bootstrapAdministrator({
    phone,
    fullName,
    email,
    password,
    bootstrapSecret: secret,
  })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Bootstrap failed:", err);
      process.exit(1);
    });
}
