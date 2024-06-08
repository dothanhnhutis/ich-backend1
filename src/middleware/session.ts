import { Request, RequestHandler as Middleware, CookieOptions } from "express";
import crypto from "crypto";
import { parse } from "cookie";
import { decrypt } from "@/utils/helper";

declare global {
  namespace Express {
    interface Request {
      sessionID: string;
      session: Session & Partial<SessionData>;
    }
  }
}

class Cookie implements CookieOptions {
  originalMaxAge: number | null;
  maxAge?: number | undefined;
  signed?: boolean | undefined;
  expires?: Date | undefined;
  httpOnly?: boolean | undefined;
  path?: string | undefined;
  domain?: string | undefined;
  secure?: boolean | undefined;
  sameSite?: boolean | "lax" | "strict" | "none" | undefined;
  constructor();
  constructor(opts?: CookieOptions) {
    this.path = "/";
    this.httpOnly = true;
    this.secure = false;
    this.originalMaxAge = null;
    if (opts) {
      this.path = opts.path;
      this.httpOnly = opts.httpOnly;
      this.secure = opts.secure;
      this.maxAge = opts.maxAge;
      this.signed = opts.signed;
      this.expires = opts.expires;
      this.domain = opts.domain;
      this.sameSite = opts.sameSite;
      if (opts?.expires && opts?.maxAge) {
        const keysIndex = Object.keys(opts);
        if (keysIndex.indexOf("maxAge") > keysIndex.indexOf("expires")) {
          this.originalMaxAge = opts.maxAge;
        } else {
          this.originalMaxAge = Math.abs(opts.expires.getTime() - Date.now());
        }
      } else if (opts?.expires) {
        this.originalMaxAge = Math.abs(opts.expires.getTime() - Date.now());
      } else if (opts.maxAge) {
        this.originalMaxAge = opts.maxAge;
      }
    }
  }
  // serialize(){
  //   return {

  //   }
  // }
}

interface SessionData {
  cookie: Cookie;
  user: {
    id: string;
  };
}

function genId(req: Request) {
  const randomId = crypto.randomBytes(10).toString("hex");
  return randomId;
}

class Session {
  id: string;
  cookie: Cookie;

  constructor(id: string);
  constructor(id: string, cookie: Cookie);
  constructor(id: string, arg2?: Cookie) {
    this.id = id;
    if (arg2) {
      this.cookie = arg2;
    } else {
      this.cookie = new Cookie();
    }
  }

  count() {
    return "";
  }
}

interface SessionOptions {
  secret: string;
  genid?(req: Request): string;
  name?: string | undefined;
  cookie?: CookieOptions | undefined;
}

const cookieProxy = (cookie: CookieOptions, cb?: () => void) => {
  return new Proxy<CookieOptions>(cookie, {
    set(target, p: keyof CookieOptions, newValue, receiver) {
      if (p == "expires") {
        delete target["maxAge"];
      } else if (p == "maxAge") {
        delete target["expires"];
      }
      target[p] = newValue;
      //   req.sessionID = req.sessionID || `${prefix}:${genId(req)}`;
      //   res.cookie(name, encrypt(req.sessionID, secret), target);
      //   setData(
      //     req.sessionID,
      //     JSON.stringify(req.session),
      //     target["expires"]
      //       ? Math.abs(target["expires"].getTime() - Date.now())
      //       : target["maxAge"]
      //   );
      return true;
    },
    get(target, p: keyof CookieOptions, receiver) {
      return target[p];
    },
  });
};

const sessionProxy = ({}) => {};

export const session =
  ({ secret, genid, name = "session", cookie }: SessionOptions): Middleware =>
  (req, res, next) => {
    // const cookies = parse(req.get("cookie") || "");
    // if (cookies[name]) {
    //   req.sessionID = decrypt(cookies[name], secret);
    //   const cookieRedis = await getData(req.sessionID);
    //   if (cookieRedis) {
    //     req.session = JSON.parse(cookieRedis);
    //   }
    // }

    // req.session = new Proxy<Session & Partial<SessionData>>(
    //   new Session("asdas"),
    //   {
    //     set(target, p, newValue, receiver) {},
    //     get(target, p: Session & Partial<SessionData>, receiver) {
    //       return target[p];
    //     },
    //   }
    // );
    req.session.next();
  };
