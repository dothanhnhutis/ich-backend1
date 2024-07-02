import prisma from "@/utils/db";
import { userPublicInfo } from "./user.service";

export async function getGoogleProvider(providerId: string) {
  return await prisma.linkProvider.findUnique({
    where: {
      provider_providerId: {
        provider: "google",
        providerId,
      },
    },
    include: {
      user: {
        select: userPublicInfo,
      },
    },
  });
}
export async function linkAccountWithGoogleProvider(
  providerId: string,
  userId: string
) {
  return await await prisma.linkProvider.create({
    data: {
      provider: "google",
      providerId,
      user: {
        connect: {
          id: userId,
        },
      },
    },
    include: {
      user: {
        select: userPublicInfo,
      },
    },
  });
}
