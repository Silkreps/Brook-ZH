declare module "nodemailer" {
  export function createTransport(url: string): { sendMail(message: { to: string; subject: string; text: string }): Promise<unknown> };
}
