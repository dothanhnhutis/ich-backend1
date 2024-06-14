import { google } from "googleapis";
import nodemailer from "nodemailer";
import configs from "../configs";
import Email from "email-templates";
import path from "path";

export interface IEmailLocals {
  appLink: string;
  appIcon: string;
  verifyLink?: string;
  resetLink?: string;
}
const oAuth2Client = new google.auth.OAuth2(
  configs.GOOGLE_CLIENT_ID,
  configs.GOOGLE_CLIENT_SECRET,
  configs.GOOGLE_REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: configs.GOOGLE_REFRESH_TOKEN });
export const sendMail = async (
  template: string,
  receiver: string,
  locals: IEmailLocals
) => {
  console.log(__dirname);

  try {
    const accessToken = (await oAuth2Client.getAccessToken()) as string;
    const smtpTransport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: configs.SENDER_EMAIL,
        clientId: configs.GOOGLE_CLIENT_ID,
        clientSecret: configs.GOOGLE_CLIENT_SECRET,
        refreshToken: configs.GOOGLE_REFRESH_TOKEN,
        accessToken,
      },
    });
    const email: Email = new Email({
      message: {
        from: `I.C.H App <${configs.SENDER_EMAIL}>`,
      },
      send: true,
      preview: true,
      transport: smtpTransport,
      views: {
        options: {
          extension: "ejs",
        },
      },

      juice: true,
      juiceResources: {
        applyStyleTags: true,
        // preserveImportant: true,
        webResources: {
          relativeTo: path.join(__dirname, "..", "/emails", template),
        },
      },
    });

    await email.send({
      template: path.join(__dirname, "..", "/emails", template),
      message: { to: receiver },
      locals,
    });
  } catch (error: any) {
    console.log(error.message);
  }
};
