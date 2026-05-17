import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id:       string;
      email?:   string | null;
      name?:    string | null;
      image?:   string | null;
      role:     string;
      username: string | null;
    };
  }

  interface User {
    role:     string;
    username: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:       string;
    role:     string;
    username: string | null;
  }
}
