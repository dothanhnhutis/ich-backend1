import { Request, Response } from "express";
import prisma from "@/utils/db";
import { StatusCodes } from "http-status-codes";
import { omit } from "lodash";

export async function currentUser(req: Request, res: Response) {
  const { id } = req.session.user!;
  const user = await prisma.user.findUnique({
    where: { id },
  });
  res
    .status(StatusCodes.OK)
    .json(
      omit(user, [
        "password",
        "emailVerificationToken",
        "activeAccountToken",
        "activeAccountExpires",
      ])
    );
}
